export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "自动记账",
  description: "让记账、导入导出与配置管理更简单。",
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
  navMenuItems: [
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
  ]
};
