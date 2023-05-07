import { React, renderToString } from '@/deps.ts';

function renderPage(page: React.ReactNode): string {
  return '<!DOCTYPE html>' + renderToString(<>{page}</>);
}

export { renderPage };
