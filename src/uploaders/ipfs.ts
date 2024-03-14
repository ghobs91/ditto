import { Conf } from '@/config.ts';
import { z } from '@/deps.ts';
import { fetchWorker } from '@/workers/fetch.ts';

import type { Uploader } from './types.ts';

/** Response schema for POST `/api/v0/add`. */
const ipfsAddResponseSchema = z.object({
  Name: z.string(),
  Hash: z.string(),
  Size: z.string(),
});

/**
 * IPFS uploader. It expects an IPFS node up and running.
 * It will try to connect to `http://localhost:5001` by default,
 * and upload the file using the REST API.
 */
const ipfsUploader: Uploader = {
  async upload(file, signal) {
    const url = new URL('/api/v0/add', Conf.ipfs.apiUrl);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWorker(url, {
      method: 'POST',
      body: formData,
      signal,
    });

    const { Hash } = ipfsAddResponseSchema.parse(await response.json());

    return {
      cid: Hash,
    };
  },
  async delete(cid, signal) {
    const url = new URL('/api/v0/pin/rm', Conf.ipfs.apiUrl);

    const query = new URLSearchParams();
    query.set('arg', cid);

    url.search = query.toString();

    await fetchWorker(url, {
      method: 'POST',
      signal,
    });
  },
};

export { ipfsUploader };
