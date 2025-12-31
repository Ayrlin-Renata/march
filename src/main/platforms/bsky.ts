import { safeStorage, nativeImage } from 'electron';
import ElectronStore from 'electron-store';
import { AtpAgent, RichText } from '@atproto/api';

// Initialize store for encrypted data
// We'll store the encrypted buffer as a hex string
const store = new ElectronStore<{
    bsky_enc_handle: string;
    bsky_enc_pass: string;
}>({
    name: 'secure_store',
    encryptionKey: 'march-secure-key' // Optional basic obfuscation for the store file itself
});

export const saveBskyCredentials = (handle: string, appPassword: string): boolean => {
    try {
        if (!safeStorage.isEncryptionAvailable()) {
            console.error('[Bsky] safeStorage is not available');
            return false;
        }

        const encHandle = safeStorage.encryptString(handle).toString('hex');
        const encPass = safeStorage.encryptString(appPassword).toString('hex');

        (store as any).set('bsky_enc_handle', encHandle);
        (store as any).set('bsky_enc_pass', encPass);

        console.log('[Bsky] Credentials saved securely');
        return true;
    } catch (error) {
        console.error('[Bsky] Failed to save credentials', error);
        return false;
    }
};

export const hasBskyCredentials = (): boolean => {
    return (store as any).has('bsky_enc_handle') && (store as any).has('bsky_enc_pass');
};

export const getBskyCredentials = () => {
    try {
        if (!safeStorage.isEncryptionAvailable()) return null;

        const dateHexHandle = (store as any).get('bsky_enc_handle');
        const dateHexPass = (store as any).get('bsky_enc_pass');

        if (!dateHexHandle || !dateHexPass) return null;

        const handle = safeStorage.decryptString(Buffer.from(dateHexHandle, 'hex'));
        const password = safeStorage.decryptString(Buffer.from(dateHexPass, 'hex'));

        return { handle, password };
    } catch (error) {
        console.error('[Bsky] Failed to decrypt credentials', error);
        return null;
    }
};

interface BskyPostContent {
    text: string;
    images: { path: string; crop?: any }[];
    scaleImages?: boolean;
}

export const postToBsky = async (content: BskyPostContent): Promise<{ success: boolean; error?: string }> => {
    const creds = getBskyCredentials();
    if (!creds) {
        return { success: false, error: 'No credentials found' };
    }

    const agent = new AtpAgent({ service: 'https://bsky.social' });

    try {
        await agent.login({
            identifier: creds.handle,
            password: creds.password,
        });

        // 1. Process Images

        const imagesToEmbed = [];
        if (content.images && content.images.length > 0) {
            for (const imgData of content.images) {
                // Read and Process
                let img = nativeImage.createFromPath(imgData.path);

                if (img.isEmpty()) {
                    console.error(`[Bsky] Image empty: ${imgData.path}`);
                    continue;
                }

                // Apply Crop if exists
                if (imgData.crop) {
                    const imgSize = img.getSize();
                    const rect = imgData.crop;
                    img = img.crop({
                        x: Math.max(0, Math.round(rect.x)),
                        y: Math.max(0, Math.round(rect.y)),
                        width: Math.min(imgSize.width, Math.round(rect.width)),
                        height: Math.min(imgSize.height, Math.round(rect.height))
                    });
                }

                // Scale if requested (Bluesky limit is roughly < 1MB, or 2000x2000 is safe)
                // If content.scaleImages is true, we resize large images.
                if (content.scaleImages) {
                    const size = img.getSize();
                    const longSide = Math.max(size.width, size.height);
                    if (longSide > 2000) {
                        img = img.resize({
                            width: size.width > size.height ? 2000 : undefined,
                            height: size.height > size.width ? 2000 : undefined,
                            quality: 'better'
                        });
                    }
                }

                // Convert to JPEG for upload (efficient compression)
                const fileBuf = img.toJPEG(85);

                // Check strict 1MB limit for Bsky
                if (fileBuf.length > 950000) {
                    // If still too big, brute force resize down
                    console.warn(`[Bsky] Image still too large (${fileBuf.length}), forcing resize.`);
                    const smaller = img.resize({ height: 1000, quality: 'good' });
                    // If simple resize isn't enough we should probably loop, but 1000px jpeg 85 is usually < 1MB.
                    const smallBuf = smaller.toJPEG(80);
                    const { data } = await agent.uploadBlob(smallBuf, { encoding: 'image/jpeg' });
                    imagesToEmbed.push({ image: data.blob, alt: "" });
                } else {
                    const { data } = await agent.uploadBlob(fileBuf, { encoding: 'image/jpeg' });
                    imagesToEmbed.push({ image: data.blob, alt: "" });
                }
            }
        }

        // 2. Process Rich Text (Facets)
        const rt = new RichText({ text: content.text });
        await rt.detectFacets(agent); // Detects mentions and links

        // 3. Create Post Record
        const postRecord: any = {
            text: rt.text,
            facets: rt.facets,
            createdAt: new Date().toISOString()
        };

        if (imagesToEmbed.length > 0) {
            postRecord.embed = {
                $type: 'app.bsky.embed.images',
                images: imagesToEmbed
            };
        }

        const res = await agent.post(postRecord);
        console.log('[Bsky] Post created:', res);

        return { success: true };

    } catch (err: any) {
        console.error('[Bsky] Post failed:', err);
        return { success: false, error: err.message || 'Unknown error' };
    }
};
