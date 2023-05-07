import { React } from '@/deps.ts';

interface ILayout {
  title: string;
  children: React.ReactNode;
}

const Layout: React.FC<ILayout> = ({ children, title }) => {
  return (
    <html lang='en'>
      <head>
        <title>{title}</title>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, user-scalable=no' />
      </head>
      <body>
        <div id='root'>{children}</div>
      </body>
    </html>
  );
};

export default Layout;
