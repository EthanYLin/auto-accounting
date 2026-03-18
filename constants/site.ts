export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "自动记账",
  description: "自动记账平台",
  navItems: [
    {
      label: "首页",
      href: "/",
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
      label: "账单",
      href: "/accounting",
    },
    {
      label: "配置",
      href: "/settings",
    },
  ],
};
