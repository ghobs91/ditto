import { z } from '@/deps.ts';
import { AppController } from '@/app.ts';
import OAuthPage from '@/pages/oauth.tsx';
import { renderPage } from '@/pages/mod.tsx';
import { parseBody } from '@/utils.ts';

const passwordGrantSchema = z.object({
  grant_type: z.literal('password'),
  password: z.string(),
});

const codeGrantSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string(),
});

const createTokenSchema = z.discriminatedUnion('grant_type', [
  passwordGrantSchema,
  codeGrantSchema,
]);

const createTokenController: AppController = async (c) => {
  const body = await parseBody(c.req.raw);
  const data = createTokenSchema.parse(body);

  switch (data.grant_type) {
    case 'password':
      return c.json({
        access_token: data.password,
        token_type: 'Bearer',
        scope: 'read write follow push',
        created_at: Math.floor(new Date().getTime() / 1000),
      });
    case 'authorization_code':
      return c.json({
        access_token: data.code,
        token_type: 'Bearer',
        scope: 'read write follow push',
        created_at: Math.floor(new Date().getTime() / 1000),
      });
  }
};

/** Display the OAuth form. */
const oauthController: AppController = (c) => {
  const encodedUri = c.req.query('redirect_uri');
  if (!encodedUri) {
    return c.text('Missing `redirect_uri` query param.', 422);
  }

  const redirectUri = decodeURIComponent(encodedUri);

  c.res.headers.set('content-security-policy', 'default-src \'self\'');

  // TODO: Login with `window.nostr` (NIP-07).
  return c.html(renderPage(OAuthPage({ redirectUri })));
};

const oauthAuthorizeController: AppController = async (c) => {
  const formData = await c.req.formData();
  const nostrId = formData.get('nostr_id');
  const redirectUri = formData.get('redirect_uri');

  if (nostrId && redirectUri) {
    const url = new URL(redirectUri.toString());
    const q = new URLSearchParams();

    q.set('code', nostrId.toString());
    url.search = q.toString();

    return c.redirect(url.toString());
  }

  return c.text('Missing `redirect_uri` or `nostr_id`.', 422);
};

export { createTokenController, oauthAuthorizeController, oauthController };
