import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">智慧课堂AI学习本</h1>
          <p className="text-muted-foreground">AI驱动的课堂ICAP学习系统</p>
        </div>
        <div className="grid gap-4">
          <Link href="/login">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>教师入口</CardTitle>
                <CardDescription>管理课程、学生和学习卡</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/student-login">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>学生入口</CardTitle>
                <CardDescription>查看学习卡、提交答案</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
