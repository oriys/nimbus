// @ts-check

const prismThemes = require("prism-react-renderer").themes;
const lightCodeTheme = prismThemes.github;
const darkCodeTheme = prismThemes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Function",
  tagline: "Firecracker/Docker Serverless Platform",
  url: "http://localhost",
  baseUrl: "/",
  onBrokenLinks: "warn",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */ ({
        docs: {
          routeBasePath: "docs",
          sidebarPath: require.resolve("./sidebars.js"),
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
      navbar: {
        title: "Function",
        logo: {
          alt: "Function",
          src: "img/logo.svg",
        },
        hideOnScroll: true,
        items: [
          { to: "/", label: "首页", position: "left" },
          {
            type: "docSidebar",
            sidebarId: "docsSidebar",
            position: "left",
            label: "文档",
          },
          { type: "doc", docId: "api/index", position: "left", label: "API" },
          {
            href: "https://github.com/oriys/function",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      colorMode: {
        respectPrefersColorScheme: true,
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              { label: "Getting Started", to: "/docs/docker-mode" },
              { label: "API Reference", to: "/docs/api" },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Function`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
