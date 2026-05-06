import { useMemo, useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { authorData } from "./profileData.js";

const CONTACT_ICONS = {
  Facebook: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  Zalo: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 13.5h-5l4.5-5.5V9h-6v1.5h4.5L9.5 16V17h7v-1.5z"/></svg>,
  TikTok: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.032 2.622.02 3.924-.044.032 1.536.694 2.94 1.71 4.029 1.138 1.1 2.603 1.815 4.14 2.133v3.91c-1.424-.136-2.784-.52-4.01-1.127-.14-.07-.282-.14-.422-.218v6.928c.036 3.108-1.57 6.13-4.306 7.632-2.784 1.528-6.19 1.41-8.835-.308-2.617-1.7-4.103-4.81-3.77-7.913.332-3.11 2.502-5.914 5.485-6.953.53-.186 1.082-.31 1.644-.372v4.06c-.463.14-.904.34-1.306.59-1.396.865-2.203 2.41-2.062 4.045.143 1.636 1.157 3.11 2.6 3.79 1.442.68 3.16.544 4.465-.353 1.258-.86 1.95-2.31 1.88-3.826V.02z"/></svg>,
  Discord: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.074 0 00-.079-.037A19.736 19.736 0 004.683 4.37a.07.07 0 00-.032.027C.533 10.493-.586 16.458.293 22.29a.072.072 0 00.03.047 19.869 19.869 0 005.974 3.028.077.077 0 00.084-.028 14.223 14.223 0 001.225-1.997.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01 10.143 10.143 0 00.372.292.077.077 0 01-.006.128c-.591.347-1.218.645-1.873.892a.076.076 0 00-.041.107c.36.698.772 1.362 1.225 1.993.023.033.057.042.084.028a19.839 19.839 0 006.002-3.03.077.077 0 00.032-.047c1.033-6.67-.638-12.596-4.66-17.893a.073.073 0 00-.033-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42.001 1.333-.946 2.418-2.157 2.418z"/></svg>,
  LinkedIn: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>,
  Instagram: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  Kaggle: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M18.825 23.859c-.022.028-.118.141-.118.141s-4.301-5.184-7.462-8.314l-1.127-.991V24H6.554V0h3.564v11.731c2.146-2.147 6.302-6.444 6.302-6.444s.1-.106.126-.134l4.022-.005-7.391 7.424 7.648 11.286z"/></svg>,
  Email: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.117 10-8.117v11.817h-20z"/></svg>,
  Default: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
};

const DEFAULT_CODE = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    long long a, b;\n    scanf("%lld %lld", &a, &b);\n    printf("%lld", a + b);\n    return 0;\n}`,
  python: `a, b = map(int, input().split())\nprint(a + b)`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        long a = sc.nextLong();\n        long b = sc.nextLong();\n        System.out.print(a + b);\n    }\n}`,
  csharp: `using System;\n\npublic class Program {\n    public static void Main() {\n        string[] parts = Console.ReadLine().Split(' ');\n        long a = long.Parse(parts[0]);\n        long b = long.Parse(parts[1]);\n        Console.Write(a + b);\n    }\n}`,
  pascal: `program Main;\nvar\n  a, b: Int64;\nbegin\n  ReadLn(a, b);\n  Write(a + b);\nend.`
};

const LANGUAGE_LIMITS = {
  c: { timeLimitMs: 1000, memoryLimitMb: 128 },
  cpp: { timeLimitMs: 1000, memoryLimitMb: 128 },
  pascal: { timeLimitMs: 1000, memoryLimitMb: 128 },
  java: { timeLimitMs: 2000, memoryLimitMb: 256 },
  csharp: { timeLimitMs: 2000, memoryLimitMb: 256 },
  python: { timeLimitMs: 3000, memoryLimitMb: 256 }
};

const UI_LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" }
];

const TRANSLATIONS = {
  vi: {
    title: "Online Judge Pro",
    subtitle: "Hệ thống chấm bài chuyên nghiệp với hiệu năng vượt trội.",
    author: "Tác giả",
    currentScore: "Điểm hiện tại",
    sourceCode: "1. Mã nguồn",
    language: "Ngôn ngữ",
    timeLimit: "Thời gian tối đa",
    memoryLimit: "Bộ nhớ tối đa",
    configuration: "2. Cấu hình",
    dropTestcases: "Thả Testcase (.IN/.OUT)",
    manualTestcase: "+ Thêm thủ công",
    executeAll: "Chấm tất cả",
    judging: "Đang chấm...",
    filterResults: "Lọc kết quả",
    executionDashboard: "3. Bảng kết quả",
    deleteAll: "Xóa tất cả",
    failedTests: "Các test bị lỗi",
    totalTests: "Tổng số test",
    passRate: "Tỷ lệ đạt",
    peakTime: "Thời gian đỉnh",
    peakMemory: "Bộ nhớ đỉnh",
    input: "Đầu vào",
    output: "Đầu ra",
    expected: "Mong đợi",
    status: "Trạng thái",
    performance: "Hiệu năng",
    actions: "Hành động",
    noData: "Chưa có dữ liệu kiểm thử.",
    edit: "Sửa",
    delete: "Xóa",
    newTestcase: "Testcase mới",
    editTestcase: "Sửa Testcase",
    saveData: "Lưu dữ liệu",
    cancel: "Hủy bỏ",
    criticalAction: "Hành động quan trọng",
    confirmDeleteAll: "Bạn có chắc muốn XÓA TOÀN BỘ testcase không? Dữ liệu sẽ không thể khôi phục.",
    confirmDelete: "Bạn có chắc muốn xóa Testcase này không?",
    acceptDelete: "Chấp nhận xóa",
    toastMissingData: "Thiếu dữ liệu",
    toastMissingDataMsg: "Vui lòng nhập code và testcase.",
    toastCompleted: "Hoàn tất",
    toastTestcaseAC: "testcase AC",
    toastError: "Lỗi",
    toastMissingOutput: "Thiếu Output",
    toastMissingOutputMsg: "Expected Output là bắt buộc.",
    toastSuccess: "Thành công",
    toastSavedTC: "Đã lưu Testcase",
    toastDeleted: "Đã xóa",
    toastDeletedAllMsg: "Toàn bộ testcase đã bị gỡ bỏ.",
    toastDeletedTCMsg: "Đã xóa Testcase",
    toastUpload: "Tải lên",
    toastReceived: "Đã nhận",
    toastDuplicate: "Trùng lặp",
    toastDuplicateMsg: "Testcase có nội dung tương tự đã tồn tại.",
    testcase: "testcase",
    statusAll: "Tất cả trạng thái",
    statusP: "Chưa chạy (P)",
    statusRJ: "Đang chấm (RJ)",
    statusAC: "Chính xác (AC)",
    statusWA: "Kết quả sai (WA)",
    statusTLE: "Quá thời gian (TLE)",
    statusMLE: "Quá bộ nhớ (MLE)",
    statusCE: "Lỗi biên dịch (CE)",
    statusER: "Lỗi thực thi (ER)",
    selectPlaceholder: "Chọn...",
    editorTitle: "Trình soạn thảo",
    settings: "Cài đặt",
    appearance: "Giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    shortcuts: "Phím tắt",
    analytics: "Thống kê",
    devNote: "Đang phát triển...",
    langCpp: "C++ Standard",
    langC: "C Language",
    langPython: "Python 3",
    langJava: "Java JDK",
    langCsharp: "C# .NET",
    langPascal: "Free Pascal",
    langNotSupported: "Ngôn ngữ không được hỗ trợ",
    toastFileSuccess: "Đã nạp file code"
  },
  en: {
    title: "Online Judge Pro",
    subtitle: "Professional judging system with superior performance.",
    author: "Author",
    currentScore: "Current Score",
    sourceCode: "1. Source Code",
    language: "Language",
    timeLimit: "Time Limit",
    memoryLimit: "Memory Limit",
    configuration: "2. Configuration",
    dropTestcases: "Drop Testcases (.IN/.OUT)",
    manualTestcase: "+ Manual Testcase",
    executeAll: "Execute All",
    judging: "Judging...",
    filterResults: "Filter Results",
    executionDashboard: "3. Execution Dashboard",
    deleteAll: "Delete All",
    failedTests: "Failed Tests",
    totalTests: "Total Tests",
    passRate: "Pass Rate",
    peakTime: "Peak Time",
    peakMemory: "Peak Memory",
    input: "Input",
    output: "Output",
    expected: "Expected",
    status: "Status",
    performance: "Performance",
    actions: "Actions",
    noData: "No test data available.",
    edit: "Edit",
    delete: "Delete",
    newTestcase: "New Testcase",
    editTestcase: "Edit Testcase",
    saveData: "Save Data",
    cancel: "Cancel",
    criticalAction: "Critical Action",
    confirmDeleteAll: "Are you sure you want to DELETE ALL testcases? This action cannot be undone.",
    confirmDelete: "Are you sure you want to delete this testcase?",
    acceptDelete: "Accept Delete",
    toastMissingData: "Missing Data",
    toastMissingDataMsg: "Please enter code and testcases.",
    toastCompleted: "Completed",
    toastTestcaseAC: "testcases AC",
    toastError: "Error",
    toastMissingOutput: "Missing Output",
    toastMissingOutputMsg: "Expected Output is required.",
    toastSuccess: "Success",
    toastSavedTC: "Saved Testcase",
    toastDeleted: "Deleted",
    toastDeletedAllMsg: "All testcases have been removed.",
    toastDeletedTCMsg: "Deleted Testcase",
    toastUpload: "Upload",
    toastReceived: "Received",
    toastDuplicate: "Duplicate",
    toastDuplicateMsg: "A testcase with similar content already exists.",
    testcase: "testcases",
    statusAll: "All Statuses",
    statusP: "Pending (P)",
    statusRJ: "Judging (RJ)",
    statusAC: "Accepted (AC)",
    statusWA: "Wrong Answer (WA)",
    statusTLE: "Time Limit Exceeded (TLE)",
    statusMLE: "Memory Limit Exceeded (MLE)",
    statusCE: "Compilation Error (CE)",
    statusER: "Runtime Error (ER)",
    selectPlaceholder: "Select...",
    editorTitle: "Editor",
    settings: "Settings",
    appearance: "Appearance",
    themeLight: "Light",
    themeDark: "Dark",
    shortcuts: "Shortcuts",
    analytics: "Analytics",
    devNote: "Under development...",
    langCpp: "C++ Standard",
    langC: "C Language",
    langPython: "Python 3",
    langJava: "Java JDK",
    langCsharp: "C# .NET",
    langPascal: "Free Pascal",
    langNotSupported: "Language not supported",
    toastFileSuccess: "Code file loaded"
  },
  ja: {
    title: "オンラインジャッジ Pro",
    subtitle: "優れたパフォーマンスを誇るプロフェッショナルな判定システム。",
    author: "著者",
    currentScore: "現在のスコア",
    sourceCode: "1. ソースコード",
    language: "言語",
    timeLimit: "時間制限",
    memoryLimit: "メモリ制限",
    configuration: "2. 設定",
    dropTestcases: "テストケースをドロップ (.IN/.OUT)",
    manualTestcase: "+ 手動追加",
    executeAll: "すべて実行",
    judging: "判定中...",
    filterResults: "結果をフィルター",
    executionDashboard: "3. 実行ダッシュボード",
    deleteAll: "すべて削除",
    failedTests: "失敗したテスト",
    totalTests: "総テスト数",
    passRate: "合格率",
    peakTime: "ピーク時間",
    peakMemory: "ピークメモリ",
    input: "入力",
    output: "出力",
    expected: "期待値",
    status: "ステータス",
    performance: "パフォーマンス",
    actions: "操作",
    noData: "テストデータがありません。",
    edit: "編集",
    delete: "削除",
    newTestcase: "新しいテストケース",
    editTestcase: "テストケースを編集",
    saveData: "保存",
    cancel: "キャンセル",
    criticalAction: "重大なアクション",
    confirmDeleteAll: "すべてのテストケースを削除してもよろしいですか？この操作は取り消せません。",
    confirmDelete: "このテストケースを削除してもよろしいですか？",
    acceptDelete: "削除を承認",
    toastMissingData: "データ不足",
    toastMissingDataMsg: "コードとテストケースを入力してください。",
    toastCompleted: "完了",
    toastTestcaseAC: "テストケース AC",
    toastError: "エラー",
    toastMissingOutput: "出力不足",
    toastMissingOutputMsg: "期待される出力は必須です。",
    toastSuccess: "成功",
    toastSavedTC: "テストケースを保存しました",
    toastDeleted: "削除済み",
    toastDeletedAllMsg: "すべてのテストケースが削除されました。",
    toastDeletedTCMsg: "テストケースを削除しました",
    toastUpload: "アップロード",
    toastReceived: "受信済み",
    toastDuplicate: "重複",
    toastDuplicateMsg: "同様の内容のテストケースが既に存在します。",
    testcase: "テストケース",
    statusAll: "すべてのステータス",
    statusP: "保留中 (P)",
    statusRJ: "判定中 (RJ)",
    statusAC: "正解 (AC)",
    statusWA: "不正解 (WA)",
    statusTLE: "時間切れ (TLE)",
    statusMLE: "メモリ制限超過 (MLE)",
    statusCE: "コンパイルエラー (CE)",
    statusER: "実行時エラー (ER)",
    selectPlaceholder: "選択...",
    editorTitle: "エディタ",
    settings: "設定",
    appearance: "外観",
    themeLight: "ライト",
    themeDark: "ダーク",
    shortcuts: "ショートカット",
    analytics: "アナリティクス",
    devNote: "開発中...",
    langCpp: "C++ Standard",
    langC: "C Language",
    langPython: "Python 3",
    langJava: "Java JDK",
    langCsharp: "C# .NET",
    langPascal: "Free Pascal"
  },
  zh: {
    title: "在线评测系统 Pro",
    subtitle: "性能卓越的专业评测系统。",
    author: "作者",
    currentScore: "当前得分",
    sourceCode: "1. 源代码",
    language: "语言",
    timeLimit: "时间限制",
    memoryLimit: "内存限制",
    configuration: "2. 配置",
    dropTestcases: "拖放测试用例 (.IN/.OUT)",
    manualTestcase: "+ 手动添加",
    executeAll: "全部执行",
    judging: "评测中...",
    filterResults: "过滤结果",
    executionDashboard: "3. 执行面板",
    deleteAll: "全部删除",
    failedTests: "失败的测试",
    totalTests: "总测试数",
    passRate: "通过率",
    peakTime: "峰值时间",
    peakMemory: "峰值内存",
    input: "输入",
    output: "输出",
    expected: "预期",
    status: "状态",
    performance: "性能",
    actions: "操作",
    noData: "暂无测试数据。",
    edit: "编辑",
    delete: "删除",
    newTestcase: "新建测试用例",
    editTestcase: "编辑测试用例",
    saveData: "保存数据",
    cancel: "取消",
    criticalAction: "关键操作",
    confirmDeleteAll: "您确定要删除所有测试用例吗？此操作无法撤销。",
    confirmDelete: "您确定要删除此测试用例吗？",
    acceptDelete: "确认删除",
    toastMissingData: "缺少数据",
    toastMissingDataMsg: "请输入代码和测试用例。",
    toastCompleted: "已完成",
    toastTestcaseAC: "测试用例通过",
    toastError: "错误",
    toastMissingOutput: "缺少输出",
    toastMissingOutputMsg: "预期输出是必填项。",
    toastSuccess: "成功",
    toastSavedTC: "已保存测试用例",
    toastDeleted: "已删除",
    toastDeletedAllMsg: "所有测试用例已移除。",
    toastDeletedTCMsg: "已删除测试用例",
    toastUpload: "上传",
    toastReceived: "已接收",
    toastDuplicate: "重复",
    toastDuplicateMsg: "已存在内容相似的测试用例。",
    testcase: "测试用例",
    statusAll: "所有状态",
    statusP: "等待 (P)",
    statusRJ: "评测中 (RJ)",
    statusAC: "通过 (AC)",
    statusWA: "答案错误 (WA)",
    statusTLE: "时间超限 (TLE)",
    statusMLE: "内存超限 (MLE)",
    statusCE: "编译错误 (CE)",
    statusER: "运行错误 (ER)",
    selectPlaceholder: "选择...",
    editorTitle: "编辑器",
    settings: "设置",
    appearance: "外观",
    themeLight: "浅色",
    themeDark: "深色",
    shortcuts: "快捷键",
    analytics: "分析",
    devNote: "开发中...",
    langCpp: "C++ Standard",
    langC: "C Language",
    langPython: "Python 3",
    langJava: "Java JDK",
    langCsharp: "C# .NET",
    langPascal: "Free Pascal"
  },
  ko: {
    title: "온라인 저지 Pro",
    subtitle: "탁월한 성능의 전문적인 저지 시스템.",
    author: "작성자",
    currentScore: "현재 점수",
    sourceCode: "1. 소스 코드",
    language: "언어",
    timeLimit: "시간 제한",
    memoryLimit: "메모리 제한",
    configuration: "2. 설정",
    dropTestcases: "테스트케이스 드롭 (.IN/.OUT)",
    manualTestcase: "+ 수동 추가",
    executeAll: "모두 실행",
    judging: "채점 중...",
    filterResults: "결과 필터링",
    executionDashboard: "3. 실행 대시보드",
    deleteAll: "모두 삭제",
    failedTests: "실패한 테스트",
    totalTests: "총 테스트",
    passRate: "합격률",
    peakTime: "피크 시간",
    peakMemory: "피크 메모리",
    input: "입력",
    output: "출력",
    expected: "예상",
    status: "상태",
    performance: "성능",
    actions: "작업",
    noData: "테스트 데이터가 없습니다.",
    edit: "수정",
    delete: "삭제",
    newTestcase: "새 테스트케이스",
    editTestcase: "테스트케이스 수정",
    saveData: "데이터 저장",
    cancel: "취소",
    criticalAction: "중요한 작업",
    confirmDeleteAll: "모든 테스트케이스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    confirmDelete: "이 테스트케이스를 삭제하시겠습니까?",
    acceptDelete: "삭제 수락",
    toastMissingData: "데이터 부족",
    toastMissingDataMsg: "코드와 테스트케이스를 입력해주세요.",
    toastCompleted: "완료",
    toastTestcaseAC: "테스트케이스 합격",
    toastError: "오류",
    toastMissingOutput: "출력 부족",
    toastMissingOutputMsg: "예상 출력은 필수입니다.",
    toastSuccess: "성공",
    toastSavedTC: "테스트케이스 저장됨",
    toastDeleted: "삭제됨",
    toastDeletedAllMsg: "모든 테스트케이스가 제거되었습니다.",
    toastDeletedTCMsg: "테스트케이스 삭제됨",
    toastUpload: "업로드",
    toastReceived: "수신됨",
    toastDuplicate: "중복",
    toastDuplicateMsg: "유사한 내용의 테스트케이스가 이미 존재합니다.",
    testcase: "테스트케이스",
    statusAll: "모든 상태",
    statusP: "대기 중 (P)",
    statusRJ: "채점 중 (RJ)",
    statusAC: "정답 (AC)",
    statusWA: "틀렸습니다 (WA)",
    statusTLE: "시간 초과 (TLE)",
    statusMLE: "메모리 초과 (MLE)",
    statusCE: "컴파일 에러 (CE)",
    statusER: "런타임 에러 (ER)",
    selectPlaceholder: "선택...",
    editorTitle: "에디터",
    settings: "설정",
    appearance: "모양",
    themeLight: "라이트",
    themeDark: "다크",
    shortcuts: "단축키",
    analytics: "분석",
    devNote: "개발 중...",
    langCpp: "C++ Standard",
    langC: "C Language",
    langPython: "Python 3",
    langJava: "Java JDK",
    langCsharp: "C# .NET",
    langPascal: "Free Pascal"
  }
};

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();
  return `status status-${value}`;
}

function CustomSelect({ value, options, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const close = () => setIsOpen(false);
    if (isOpen) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [isOpen]);

  return (
    <div className="select-container" onClick={e => e.stopPropagation()}>
      <div className={`select-trigger ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedOption?.label || placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      {isOpen && (
        <div className="select-options">
          {options.map(opt => (
            <div key={opt.value} className={`select-option ${opt.value === value ? 'active' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomCursor() {
  const [hoverState, setHoverState] = useState("default");
  useEffect(() => {
    const nucleus = document.getElementById("cursor-nucleus");
    const aura = document.getElementById("cursor-aura");
    if (!nucleus || !aura) return;
    const handleMouseMove = (e) => {
      const x = e.clientX, y = e.clientY;
      nucleus.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      aura.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      const target = e.target;
      if (!target) return;
      const isPointer = target.closest("button, a, .theme-toggle, .upload-box, .btn-icon, .author-btn, .btn-action-pro, .social-card, .select-trigger, .select-option");
      const isText = target.closest("input, textarea, .monaco-editor, .case-textarea");
      if (isPointer) setHoverState("pointer");
      else if (isText) setHoverState("text");
      else setHoverState("default");
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  return (
    <>
      <div id="cursor-aura" className={`cursor-aura hover-${hoverState}`} />
      <div id="cursor-nucleus" className={`cursor-nucleus hover-${hoverState}`} />
    </>
  );
}

function NeuralBackground() {
  useEffect(() => {
    const canvas = document.getElementById("neural-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let points = [];
    let mouse = { x: null, y: null };
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      points = [];
      for (let i = 0; i < 80; i++) {
        points.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
      }
    };
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const theme = document.body.getAttribute("data-theme");
      ctx.strokeStyle = theme === "dark" ? "rgba(94, 234, 212, 0.25)" : "rgba(14, 165, 233, 0.25)";
      ctx.fillStyle = theme === "dark" ? "rgba(94, 234, 212, 0.5)" : "rgba(14, 165, 233, 0.5)";
      points.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 150) { ctx.lineWidth = 1 - dist / 150; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
        }
        if (mouse.x) {
          const mDist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (mDist < 200) { ctx.lineWidth = (1 - mDist / 200) * 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
        }
      });
      requestAnimationFrame(animate);
    };
    const handleMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener("resize", init); window.addEventListener("mousemove", handleMouseMove);
    init(); animate();
    return () => { window.removeEventListener("resize", init); window.removeEventListener("mousemove", handleMouseMove); };
  }, []);
  return <canvas id="neural-canvas" />;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [appLang, setAppLang] = useState(() => localStorage.getItem("appLang") || "vi");
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(DEFAULT_CODE.cpp);
  const [editorRef, setEditorRef] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadedTestcases, setUploadedTestcases] = useState([]);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toasts, setToasts] = useState([]);
  const [testcaseModalOpen, setTestcaseModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [targetDeleteIndex, setTargetDeleteIndex] = useState(null);
  const [manualInput, setManualInput] = useState("");
  const [manualOutput, setManualOutput] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedLimits = LANGUAGE_LIMITS[language] || LANGUAGE_LIMITS.cpp;
  const t = TRANSLATIONS[appLang];

  useEffect(() => {
    const close = () => setSettingsOpen(false);
    if (settingsOpen) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [settingsOpen]);

  const LANGUAGE_OPTIONS = useMemo(() => [
    { value: "cpp", label: t.langCpp },
    { value: "c", label: t.langC },
    { value: "python", label: t.langPython },
    { value: "java", label: t.langJava },
    { value: "csharp", label: t.langCsharp },
    { value: "pascal", label: t.langPascal }
  ], [t]);

  const STATUS_OPTIONS = useMemo(() => [
    { value: "ALL", label: t.statusAll },
    { value: "P", label: t.statusP },
    { value: "RJ", label: t.statusRJ },
    { value: "AC", label: t.statusAC },
    { value: "WA", label: t.statusWA },
    { value: "TLE", label: t.statusTLE },
    { value: "MLE", label: t.statusMLE },
    { value: "CE", label: t.statusCE },
    { value: "ER", label: t.statusER }
  ], [t]);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("appLang", appLang);
  }, [appLang]);

  useEffect(() => {
    if (isFullScreen) document.body.classList.add("editor-fullscreen-active");
    else document.body.classList.remove("editor-fullscreen-active");
    return () => document.body.classList.remove("editor-fullscreen-active");
  }, [isFullScreen]);

  useEffect(() => {
    if (editorRef) {
      const timers = [100, 500, 1000, 2000].map(ms => setTimeout(() => editorRef.layout(), ms));
      document.fonts.ready.then(() => editorRef.layout());
      return () => timers.forEach(clearTimeout);
    }
  }, [editorRef, isFullScreen]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const displayedResult = useMemo(() => {
    if (result) return result;
    if (!uploadedTestcases.length) return null;
    return { status: "P", results: uploadedTestcases };
  }, [result, uploadedTestcases]);

  const filteredResults = useMemo(() => {
    const rows = displayedResult?.results || [];
    return statusFilter === "ALL" ? rows : rows.filter(item => item.status === statusFilter);
  }, [displayedResult, statusFilter]);

  const performanceStats = useMemo(() => {
    const rows = displayedResult?.results || [];
    if (!rows.length) return { maxTime: 0, maxMemory: 0, passCount: 0 };
    let maxT = 0, maxM = 0, pass = 0;
    rows.forEach(r => {
      if (r.timeMs > maxT) maxT = r.timeMs;
      if (r.memoryMb > maxM) maxM = r.memoryMb;
      if (r.status === "AC") pass++;
    });
    return { maxTime: maxT, maxMemory: maxM, passCount: pass };
  }, [displayedResult]);

  const showToast = (type, title, message) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  const handleRun = async () => {
    if (!code.trim() || !uploadedTestcases.length) {
      showToast("warning", t.toastMissingData, t.toastMissingDataMsg);
      return;
    }
    setRunning(true);
    setResult({ status: "RJ", results: uploadedTestcases.map(t => ({ ...t, status: "RJ" })) });
    try {
      const formData = new FormData();
      formData.append("language", language);
      formData.append("code", code);
      files.forEach(f => formData.append("files", f));
      
      const res = await fetch(`${API_BASE_URL}/api/judge`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t.toastError);
      setResult(data);
      showToast(data.status === "AC" ? "success" : "warning", t.toastCompleted, `${data.passedTests}/${data.totalTests} ${t.toastTestcaseAC}.`);
    } catch (err) {
      setResult({ status: "SE", message: err.message, results: [] });
      showToast("error", t.toastError, err.message);
    } finally { setRunning(false); }
  };

  const handleAddManualTestcase = () => {
    if (!manualOutput.trim()) { showToast("warning", t.toastMissingOutput, t.toastMissingOutputMsg); return; }
    
    // Check duplicate content
    const isDuplicate = uploadedTestcases.some(tc => 
      tc.inputPreview === manualInput && 
      tc.expectedPreview === manualOutput && 
      tc.index !== editingIndex
    );
    if (isDuplicate) {
      showToast("warning", t.toastDuplicate, t.toastDuplicateMsg);
      return;
    }

    const index = editingIndex !== null ? editingIndex : (uploadedTestcases.length ? Math.max(...uploadedTestcases.map(t => t.index)) + 1 : 1);
    const nextFiles = Array.from(files).filter(f => !f.name.match(new RegExp(`^${index}\\.(IN|OUT)$`, 'i')));
    const inFile = new File([manualInput], `${index}.IN`, { type: "text/plain" });
    const outFile = new File([manualOutput], `${index}.OUT`, { type: "text/plain" });
    setFiles([...nextFiles, inFile, outFile]);
    const newTC = { index, inputFile: `${index}.IN`, outputFile: `${index}.OUT`, inputPreview: manualInput, expectedPreview: manualOutput, status: 'P' };
    if (editingIndex !== null) setUploadedTestcases(uploadedTestcases.map(t => t.index === index ? newTC : t));
    else setUploadedTestcases([...uploadedTestcases, newTC]);
    setTestcaseModalOpen(false); setEditingIndex(null); setManualInput(""); setManualOutput(""); setResult(null);
    showToast("success", t.toastSuccess, `${t.toastSavedTC} #${index}.`);
  };

  const confirmDeleteAll = () => setDeleteAllConfirmOpen(true);
  const handleDeleteAll = () => { setUploadedTestcases([]); setFiles([]); setResult(null); setDeleteAllConfirmOpen(false); showToast("info", t.toastDeleted, t.toastDeletedAllMsg); };

  const handleEdit = (idx) => { const tc = uploadedTestcases.find(t => t.index === idx); if (tc) { setManualInput(tc.inputPreview); setManualOutput(tc.expectedPreview); setEditingIndex(idx); setTestcaseModalOpen(true); } };
  const confirmDelete = (idx) => { setTargetDeleteIndex(idx); setDeleteConfirmOpen(true); };
  const handleDelete = () => {
    setUploadedTestcases(uploadedTestcases.filter(t => t.index !== targetDeleteIndex));
    setFiles(files.filter(f => !f.name.match(new RegExp(`^${targetDeleteIndex}\\.(IN|OUT)$`, 'i'))));
    setDeleteConfirmOpen(false); setResult(null);
    showToast("info", t.toastDeleted, `${t.toastDeletedTCMsg} #${targetDeleteIndex}.`);
  };

  const handleCodeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    const extMap = {
      'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp',
      'c': 'c', 'h': 'c',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'pas': 'pascal', 'pp': 'pascal'
    };

    const detectedLang = extMap[extension];
    
    if (!detectedLang) {
      showToast("error", t.toastError, t.langNotSupported);
    } else {
      if (detectedLang !== language) {
        setLanguage(detectedLang);
      }
      const text = await file.text();
      setCode(text);
      showToast("success", t.toastSuccess, `${t.toastFileSuccess}: ${file.name}`);
    }
    e.target.value = "";
  };

  return (
    <div className="page">
      <CustomCursor />
      <NeuralBackground />
      <header className="header">
        <div className="header-left">
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <div className="author-strip">
            <button className="author-btn" onClick={() => setContactModalOpen(true)}>{t.author}: {authorData.name}</button>
          </div>
        </div>
        <div className="header-right">
          <div className="score-card-pro">
            <div className="score-main">
              <span>{t.currentScore}</span>
              <strong>{displayedResult?.score ?? 0}</strong>
            </div>
            <div className="score-stats">
              <div className="score-badge">PRO</div>
              <div className="score-subtext">{performanceStats.passCount}/{uploadedTestcases.length} AC</div>
            </div>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>{t.sourceCode}</h2>
          <div className="form-grid">
            <label>{t.language}
              <CustomSelect value={language} options={LANGUAGE_OPTIONS} onChange={(val) => { setLanguage(val); setCode(DEFAULT_CODE[val]); }} placeholder={t.selectPlaceholder} />
            </label>
            <label>{t.timeLimit}
              <div className="info-display">{selectedLimits.timeLimitMs}ms</div>
            </label>
            <label>{t.memoryLimit}
              <div className="info-display">{selectedLimits.memoryLimitMb}MB</div>
            </label>
          </div>
          <div className={`code-editor-container ${isFullScreen ? 'fullscreen' : ''}`}>
            <div className="editor-toolbar">
              <span>{t.editorTitle} - {language}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label className="btn-icon" title={t.toastUpload} style={{ cursor: 'pointer' }}>
                  <input type="file" style={{ display: 'none' }} onChange={handleCodeUpload} accept=".cpp,.cc,.cxx,.c,.py,.java,.cs,.pas,.pp" />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </label>
                <button className="btn-icon" onClick={() => setIsFullScreen(!isFullScreen)} title={isFullScreen ? t.cancel : t.executeAll}>
                  {isFullScreen ? 
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg> :
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                  }
                </button>
              </div>
            </div>
            <Editor height={isFullScreen ? "calc(100vh - 60px)" : "500px"} language={language} theme={theme === "dark" ? "vs-dark" : "light"} value={code} onMount={setEditorRef} onChange={(v) => setCode(v || "")}
              options={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontLigatures: false, letterSpacing: 0, minimap: { enabled: false }, automaticLayout: true, padding: { top: 16, bottom: 16 }, cursorBlinking: "smooth", formatOnPaste: true, tabSize: 4, lineNumbersMinChars: 3, scrollBeyondLastLine: false, wordWrap: "on" }}
            />
          </div>
        </section>

        <aside className="panel">
          <h2>{t.configuration}</h2>
          <label className="upload-box">
            <input type="file" multiple onChange={async (e) => {
              const selected = Array.from(e.target.files);
              const entries = await Promise.all(selected.map(async f => ({ name: f.name, content: await f.text(), file: f })));
              
              const parsedBatch = (function parse(fileEntries) {
                const map = new Map();
                fileEntries.forEach(f => {
                  const m = f.name.match(/^(\d+)\.(in|out)$/i); if (!m) return;
                  const i = Number(m[1]), t = m[2].toLowerCase(); if (!map.has(i)) map.set(i, { index: i, files: [] });
                  const tc = map.get(i); 
                  if (t === "in") tc.inputPreview = f.content; 
                  if (t === "out") tc.expectedPreview = f.content;
                  tc.files.push(f.file);
                });
                return [...map.values()].filter(i => i.inputPreview !== undefined && i.expectedPreview !== undefined);
              })(entries);

              const existingIndices = new Set(uploadedTestcases.map(t => t.index));
              const existingContents = new Set(uploadedTestcases.map(t => `${t.inputPreview}|||${t.expectedPreview}`));
              
              const finalToAdd = [];
              let duplicateCount = 0;
              let nextIndex = uploadedTestcases.length ? Math.max(...uploadedTestcases.map(t => t.index)) + 1 : 1;

              parsedBatch.forEach(tc => {
                if (existingContents.has(`${tc.inputPreview}|||${tc.expectedPreview}`)) {
                  duplicateCount++;
                } else {
                  // If index exists, we assign a new one to avoid overwriting unless that's what's intended.
                  // But usually for "uploading new files", we want to avoid collisions.
                  const targetIndex = existingIndices.has(tc.index) ? nextIndex++ : tc.index;
                  finalToAdd.push({ ...tc, index: targetIndex, status: "P" });
                  existingIndices.add(targetIndex);
                }
              });

              if (finalToAdd.length > 0) {
                const newFiles = finalToAdd.flatMap(tc => tc.files);
                setFiles(prev => [...prev, ...newFiles]);
                setUploadedTestcases(prev => [...prev, ...finalToAdd].sort((a,b) => a.index - b.index));
                showToast("success", t.toastUpload, `${t.toastReceived} ${finalToAdd.length} ${t.testcase}.`);
              }

              if (duplicateCount > 0) {
                showToast("warning", t.toastDuplicate, `${duplicateCount} ${t.toastDuplicateMsg}`);
              }
              e.target.value = ""; // Clear input for same file re-upload
              }} />            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginBottom: '8px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>{t.dropTestcases}</span>
          </label>
          <button className="secondary-button" onClick={() => { setEditingIndex(null); setManualInput(""); setManualOutput(""); setTestcaseModalOpen(true); }}>{t.manualTestcase}</button>
          <button className="run-button" disabled={running} onClick={handleRun}>{running ? t.judging : t.executeAll}</button>
          <div style={{ marginTop: '24px' }}>
            <label>{t.filterResults}
              <CustomSelect value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} placeholder={t.selectPlaceholder} />
            </label>
          </div>
        </aside>
      </main>

      <section className="panel" style={{ marginTop: '32px' }}>
        <div className="results-header">
          <h2>{t.executionDashboard}</h2>
          <button className="author-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={confirmDeleteAll}>{t.deleteAll}</button>
        </div>

        <div className="results-stats-bar">
          <div className="stat-item"><span>{t.totalTests}</span><strong>{uploadedTestcases.length}</strong></div>
          <div className="stat-item"><span>{t.passRate}</span><strong>{performanceStats.passCount} AC</strong></div>
          <div className="stat-item"><span>{t.peakTime}</span><strong>{performanceStats.maxTime}ms</strong></div>
          <div className="stat-item"><span>{t.peakMemory}</span><strong>{performanceStats.maxMemory ? performanceStats.maxMemory.toFixed(1) : 0}MB</strong></div>
        </div>

        <div className="results-scroll-container">
          <table>
            <thead><tr><th>#</th><th>{t.input}</th><th>{t.output}</th><th>{t.expected}</th><th>{t.status}</th><th>{t.performance}</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {filteredResults.map(item => (
                <tr key={item.index}>
                  <td>#{item.index}</td>
                  <td><div className="table-preview-box">{item.status === 'AC' ? '-' : item.inputPreview}</div></td>
                  <td><div className="table-preview-box">{(item.status === 'RJ' || running) ? '...' : (item.status === 'AC' ? '-' : item.stdoutPreview || '-')}</div></td>
                  <td><div className="table-preview-box">{item.status === 'AC' ? '-' : item.expectedPreview}</div></td>
                  <td><span className={getStatusClass(item.status)}>{t[`status${item.status}`] || item.status}</span></td>
                  <td><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.timeMs ? `${item.timeMs}ms` : '-'}<br/>{item.memoryMb ? `${item.memoryMb.toFixed(1)}MB` : '-'}</div></td>
                  <td>
                    <div className="action-cell">
                      <button className="btn-action-pro" onClick={() => handleEdit(item.index)} title={t.edit}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                      <button className="btn-action-pro delete" onClick={() => confirmDelete(item.index)} title={t.delete}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredResults.length && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t.noData}</td></tr>}
            </tbody>
          </table>
        </div>

        {displayedResult?.results?.some(r => r.status !== 'AC' && r.status !== 'P' && r.status !== 'RJ') && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ marginBottom: '16px', color: '#f87171' }}>{t.failedTests}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
              {displayedResult.results.filter(r => r.status !== 'AC' && r.status !== 'P' && r.status !== 'RJ').map(r => (
                <div key={r.index} className="panel" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong>Testcase #{r.index}</strong>
                    <span className={getStatusClass(r.status)}>{t[`status${r.status}`] || r.status}</span>
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <label>{t.input}<div className="info-display" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{r.inputPreview}</div></label>
                    <label>{t.expected}<div className="info-display" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{r.expectedPreview}</div></label>
                    <label>{t.output}<div className="info-display" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#f87171' }}>{r.stdoutPreview || '-'}</div></label>
                    {r.message && <div style={{ fontSize: '0.85rem', color: '#f87171', marginTop: '8px' }}>{r.message}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      {contactModalOpen && (
        <div className="modal-backdrop" onClick={() => setContactModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'center' }}>
              <div><h2 style={{ fontSize: '2rem', margin: 0 }}>Social Command Center</h2><p style={{ margin: '4px 0 0 0' }}>{authorData.name} - Official Links</p></div>
              <button className="theme-toggle" onClick={() => setContactModalOpen(false)}>×</button>
            </div>
            <div className="social-grid">
              {authorData.contacts.map((c) => (
                <a key={c.label} className="social-card" href={c.url} target="_blank" rel="noreferrer">
                  <div className="social-icon-wrapper">{CONTACT_ICONS[c.label] || CONTACT_ICONS.Default}</div>
                  <label>{c.label}</label>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {testcaseModalOpen && (
        <div className="modal-backdrop" onClick={() => setTestcaseModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingIndex !== null ? t.editTestcase : t.newTestcase}</h2>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label>{t.input}<textarea className="case-textarea" value={manualInput} onChange={e => setManualInput(e.target.value)} /></label>
              <label>{t.output}<textarea className="case-textarea" value={manualOutput} onChange={e => setManualOutput(e.target.value)} /></label>
            </div>
            <div className="modal-btn-group">
              <button className="modal-btn btn-ghost" onClick={() => setTestcaseModalOpen(false)}>{t.cancel}</button>
              <button className="modal-btn btn-primary" onClick={handleAddManualTestcase}>{t.saveData}</button>
            </div>
          </div>
        </div>
      )}

      {(deleteConfirmOpen || deleteAllConfirmOpen) && (
        <div className="modal-backdrop" onClick={() => { setDeleteConfirmOpen(false); setDeleteAllConfirmOpen(false); }}>
          <div className="modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <h2>{t.criticalAction}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{deleteAllConfirmOpen ? t.confirmDeleteAll : t.confirmDelete}</p>
            <div className="modal-btn-group">
              <button className="modal-btn btn-ghost" onClick={() => { setDeleteConfirmOpen(false); setDeleteAllConfirmOpen(false); }}>{t.cancel}</button>
              <button className="modal-btn btn-primary" style={{ backgroundColor: '#ef4444' }} onClick={deleteAllConfirmOpen ? handleDeleteAll : handleDelete}>{t.acceptDelete}</button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-container theme-toggle-fixed" onClick={e => e.stopPropagation()}>
        <button className="theme-toggle" onClick={() => setSettingsOpen(!settingsOpen)} title={t.settings}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2 2 2 0 0 1-2 2 2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2 2 2 0 0 1 2 2 2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2 2 2 0 0 1 2-2 2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2 2 2 0 0 1-2-2 2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
        {settingsOpen && (
          <div className="settings-menu">
            <div className="settings-item-label" style={{ padding: '8px 12px' }}>
              <strong>{t.settings}</strong>
            </div>
            <div className="settings-divider"></div>
            
            <div className="settings-item-label" style={{ padding: '8px 12px' }}>
              <small>{t.language}</small>
              <div style={{ marginTop: '8px' }}>
                <CustomSelect value={appLang} options={UI_LANGUAGES} onChange={setAppLang} placeholder={t.selectPlaceholder} />
              </div>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-item" onClick={toggleTheme}>
              <div className="settings-icon">
                {theme === 'dark' ? 
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> :
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                }
              </div>
              <div className="settings-item-label">
                <span>{t.appearance}</span>
                <small>{theme === 'dark' ? t.themeDark : t.themeLight}</small>
              </div>
            </div>

            <div className="settings-divider"></div>

            <div className="settings-item disabled" onClick={() => showToast("info", t.devNote, t.devNote)}>
              <div className="settings-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg></div>
              <div className="settings-item-label"><span>{t.shortcuts}</span><small>{t.devNote}</small></div>
            </div>

            <div className="settings-item disabled" onClick={() => showToast("info", t.devNote, t.devNote)}>
              <div className="settings-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg></div>
              <div className="settings-item-label"><span>{t.analytics}</span><small>{t.devNote}</small></div>
            </div>
          </div>
        )}
      </div>

      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toast-icon">
              {t.type === "success" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              {t.type === "error" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
              {t.type === "warning" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>}
              {t.type === "info" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line></svg>}
            </div>
            <div className="toast-content"><strong>{t.title}</strong><p>{t.message}</p></div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
            <div className="toast-progress" />
          </div>
        ))}
      </div>
    </div>
  );
}
