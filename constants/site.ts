export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "自动记账",
  description: "自动记账平台",
  navItems: [
    {
      label: "账单",
      href: "/transactions",
    },
    {
      label: "导入",
      href: "/upload",
    },
    {
      label: "导出",
      href: "/export",
    },
    {
      label: "总览",
      href: "/overview",
    },
    {
      label: "配置",
      href: "/settings",
    },
  ],
};
