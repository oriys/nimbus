// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    "index",
    {
      type: "category",
      label: "Getting Started",
      items: ["docker-mode", "workflows", "load-testing", "observability"],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/index", "api/functions", "api/invocations", "api/system"],
    },
  ],
};

module.exports = sidebars;
