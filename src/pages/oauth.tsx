import { React } from '@/deps.ts';
import Layout from './layout.tsx';

interface IOAuthPage {
  redirectUri: string;
}

const OAuthPage: React.FC<IOAuthPage> = ({ redirectUri }) => {
  return (
    <Layout title='Log in with Ditto'>
      <form action='/oauth/authorize' method='post'>
        <input type='text' placeholder='npub1... or nsec1...' name='nostr_id' autoComplete='off' />
        <input type='hidden' name='redirect_uri' id='redirect_uri' value={redirectUri} autoComplete='off' />
        <button type='submit'>Authorize</button>
      </form>
    </Layout>
  );
};

export default OAuthPage;
