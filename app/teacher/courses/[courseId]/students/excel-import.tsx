"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importStudents } from "@/lib/actions/students";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const COLUMN_MAP: Record<string, string> = {
  学号: "studentNo",
  姓名: "name",
  性别: "gender",
  学院: "college",
  年级: "grade",
  专业: "major",
  班级: "class",
  手机号码: "phone",
  电子邮箱: "email",
  是否重修: "isRetake",
};

type StudentRow = {
  studentNo: string;
  name: string;
  gender?: string;
  college?: string;
  grade?: string;
  major?: string;
  class?: string;
  phone?: string;
  email?: string;
  isRetake?: boolean;
};

export function ExcelImport({ courseId }: { courseId: string }) {
  const [previewData, setPreviewData] = useState<StudentRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const mapped: StudentRow[] = jsonData.map((row) => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          const trimmedKey = key.trim();
          const mappedKey = COLUMN_MAP[trimmedKey];
          if (mappedKey) {
            if (mappedKey === "isRetake") {
              result[mappedKey] =
                value === "是" || value === true || value === 1;
            } else {
              result[mappedKey] = String(value ?? "").trim();
            }
          }
        }
        return result as unknown as StudentRow;
      });

      // Filter out rows without studentNo or name
      const valid = mapped.filter((r) => r.studentNo && r.name);
      setPreviewData(valid);
      setShowPreview(true);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    startTransition(async () => {
      const result = await importStudents(courseId, previewData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`成功导入 ${result.count} 名学生`);
        setShowPreview(false);
        setPreviewData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    });
  }

  function handleCancel() {
    setShowPreview(false);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        id="excel-file-input"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
      >
        导入 Excel
      </Button>

      {showPreview && previewData.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              共解析 {previewData.length} 条学生数据
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                取消
              </Button>
              <Button size="sm" onClick={handleImport} disabled={isPending}>
                {isPending ? "导入中..." : "确认导入"}
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>性别</TableHead>
                  <TableHead>学院</TableHead>
                  <TableHead>年级</TableHead>
                  <TableHead>专业</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>手机</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>重修</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.studentNo}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.gender ?? ""}</TableCell>
                    <TableCell>{row.college ?? ""}</TableCell>
                    <TableCell>{row.grade ?? ""}</TableCell>
                    <TableCell>{row.major ?? ""}</TableCell>
                    <TableCell>{row.class ?? ""}</TableCell>
                    <TableCell>{row.phone ?? ""}</TableCell>
                    <TableCell>{row.email ?? ""}</TableCell>
                    <TableCell>{row.isRetake ? "是" : "否"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
