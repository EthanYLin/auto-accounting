import { Metadata } from "next";

export const metadata: Metadata = {
  title: "记账管理 - 自动记账系统",
  description: "智能记账管理界面，支持批量处理、分账、附加等功能",
};

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
