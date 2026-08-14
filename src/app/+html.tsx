import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The HTML document every statically exported page is rendered into.
 *
 * Without this file Expo falls back to a bare default whose `<title>` is empty,
 * which is what the deployed site shipped: the browser tab, every bookmark and
 * every shared link showed nothing but the bare host name. The head has to live
 * here rather than in a component, because it is written once at export time -
 * a search engine or a chat app's link unfurler reads the HTML and never runs
 * the bundle, so anything set from React is invisible to them.
 *
 * This runs in Node during `expo export`, so it must contain no client-side
 * logic - no hooks, no browser globals, no event handlers.
 */
const TITLE = 'OnSpot – sieh, was gerade passiert';
const DESCRIPTION =
  'Live-Streams, Events und Orte auf einer Karte – von deiner Straße bis Tokio.';
/** The accent the app opens with; colours the browser chrome on Android. */
const THEME_COLOR = '#8b5cf6';
/** Absolute, because link unfurlers fetch `og:image` from their own servers
 *  with no page URL to resolve a relative path against. Change this alongside
 *  the deployment target. The file itself lives in `public/`, so the export
 *  copies it to the site root untouched and un-hashed. */
const SITE_URL = 'https://djml123.github.io';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function Root({ children }: PropsWithChildren) {
  return (
    // German, because the entire interface is. The default was `en`, which
    // tells screen readers to pronounce every label with English phonetics.
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* `viewport-fit=cover` lets the map reach under the notch and the home
            indicator, which is where the bottom nav already positions itself. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content={THEME_COLOR} />

        {/* Link previews. Without these a shared link renders as a bare URL in
            WhatsApp, Discord, iMessage and every other unfurler. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="OnSpot" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:locale" content="de_DE" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/*
          Disable body scrolling on web. This makes ScrollView components work
          closer to how they do on native.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
