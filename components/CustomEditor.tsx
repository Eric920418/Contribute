"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// 使用動態導入避免 SSR 問題
const CKEditor = dynamic(
  () => import("@ckeditor/ckeditor5-react").then((mod) => ({ default: mod.CKEditor })),
  { ssr: false }
);

const DecoupledEditor = dynamic(
  () => import("@ckeditor/ckeditor5-build-decoupled-document").then((mod) => ({ default: mod.default })),
  { ssr: false }
);

interface CustomEditorProps {
  onContentChange: (value: string) => void;
  height?: string | number;
  placeholder?: string;
  initialData?: string;
}

export default function CustomEditor({
  placeholder,
  onContentChange,
  height = "200px",
  initialData = "",
}: CustomEditorProps) {
  const [isReady, setIsReady] = useState(false);
  const [Editor, setEditor] = useState<any>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 動態載入編輯器
    const loadEditor = async () => {
      try {
        const { CKEditor } = await import("@ckeditor/ckeditor5-react");
        const DecoupledEditorBuild = await import("@ckeditor/ckeditor5-build-decoupled-document");
        setEditor({ CKEditor, DecoupledEditor: DecoupledEditorBuild.default });
        setIsReady(true);
      } catch (error) {
        console.error("載入編輯器失敗:", error);
      }
    };

    loadEditor();
    return () => setIsReady(false);
  }, []);

  const handleEditorReady = (editor: any) => {
    // 將工具列添加到指定容器
    if (toolbarRef.current) {
      toolbarRef.current.appendChild(editor.ui.view.toolbar.element);
    }
  };

  const handleEditorChange = (event: any, editor: any) => {
    const data = editor.getData();
    if (onContentChange) {
      onContentChange(data);
    }
  };

  if (!isReady || !Editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">載入編輯器中...</span>
      </div>
    );
  }

  return (
    <div className="editor-wrapper">
      <style>{`
        .ck-editor__editable {
          min-height: ${typeof height === "number" ? `${height}px` : height};
          max-height: ${typeof height === "number" ? `${height}px` : height};
          overflow-y: auto;
        }
        .editor-toolbar {
          border: 1px solid #ccc;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          background: #f8f9fa;
        }
        .editor-content {
          border: 1px solid #ccc;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
      `}</style>
      <div className="editor-container">
        <div ref={toolbarRef} className="editor-toolbar"></div>
        <div className="editor-content">
          <Editor.CKEditor
            editor={Editor.DecoupledEditor}
            data={initialData}
            config={{
              placeholder: placeholder || "在此輸入或貼上您的內容！",
              language: "zh",
              licenseKey: process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY || "GPL",
              toolbar: {
                items: [
                  "heading",
                  "|",
                  "fontSize",
                  "fontFamily",
                  "fontColor",
                  "fontBackgroundColor",
                  "|",
                  "bold",
                  "italic",
                  "underline",
                  "strikethrough",
                  "removeFormat",
                  "|",
                  "horizontalLine",
                  "link",
                  "insertImage",
                  "insertTable",
                  "highlight",
                  "blockQuote",
                  "|",
                  "alignment",
                  "|",
                  "bulletedList",
                  "numberedList",
                  "todoList",
                  "outdent",
                  "indent",
                  "|",
                  "undo",
                  "redo"
                ],
                shouldNotGroupWhenFull: false,
              },
              fontSize: {
                options: [
                  9,
                  11,
                  13,
                  "default",
                  17,
                  19,
                  21,
                  24,
                  28,
                  32,
                  36,
                  48
                ]
              },
              fontFamily: {
                options: [
                  'default',
                  'Arial, Helvetica, sans-serif',
                  'Courier New, Courier, monospace',
                  'Georgia, serif',
                  'Lucida Sans Unicode, Lucida Grande, sans-serif',
                  'Tahoma, Geneva, sans-serif',
                  'Times New Roman, Times, serif',
                  'Trebuchet MS, Helvetica, sans-serif',
                  'Verdana, Geneva, sans-serif',
                  '微軟正黑體, Microsoft JhengHei, sans-serif',
                  '新細明體, PMingLiU, serif'
                ]
              },
              heading: {
                options: [
                  { model: 'paragraph', title: '段落', class: 'ck-heading_paragraph' },
                  { model: 'heading1', view: 'h1', title: '標題 1', class: 'ck-heading_heading1' },
                  { model: 'heading2', view: 'h2', title: '標題 2', class: 'ck-heading_heading2' },
                  { model: 'heading3', view: 'h3', title: '標題 3', class: 'ck-heading_heading3' },
                  { model: 'heading4', view: 'h4', title: '標題 4', class: 'ck-heading_heading4' },
                  { model: 'heading5', view: 'h5', title: '標題 5', class: 'ck-heading_heading5' },
                  { model: 'heading6', view: 'h6', title: '標題 6', class: 'ck-heading_heading6' }
                ]
              },
              table: {
                contentToolbar: [
                  'tableColumn',
                  'tableRow',
                  'mergeTableCells',
                  'tableCellProperties',
                  'tableProperties'
                ]
              },
              image: {
                toolbar: [
                  'imageTextAlternative',
                  'imageStyle:inline',
                  'imageStyle:block',
                  'imageStyle:side',
                  'linkImage'
                ]
              },
            }}
            onReady={handleEditorReady}
            onChange={handleEditorChange}
          />
        </div>
      </div>
    </div>
  );
}