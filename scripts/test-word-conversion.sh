#!/bin/bash

# 測試 Word 轉 PDF 功能腳本
set -e

echo "🧪 測試 LibreOffice Word 轉 PDF 功能..."

# 檢查 LibreOffice 是否安裝
if command -v libreoffice >/dev/null 2>&1; then
    echo "✅ LibreOffice 已安裝: $(libreoffice --version)"
elif command -v soffice >/dev/null 2>&1; then
    echo "✅ LibreOffice (soffice) 已安裝: $(soffice --version)"
else
    echo "❌ LibreOffice 未安裝，請先安裝 LibreOffice"
    exit 1
fi

# 創建測試目錄
TEST_DIR="/tmp/libreoffice-test"
mkdir -p "$TEST_DIR"

# 創建測試 Word 檔案（簡單的 RTF 格式）
cat > "$TEST_DIR/test.rtf" << 'EOF'
{\rtf1\ansi\deff0 {\fonttbl {\f0 Times New Roman;}}
\f0\fs24 This is a test document for LibreOffice conversion.
\par
Testing Word to PDF conversion functionality.
\par
LibreOffice headless conversion test.
}
EOF

echo "📄 創建測試檔案: $TEST_DIR/test.rtf"

# 測試轉換
echo "🔄 執行 Word 轉 PDF 測試..."
# 檢查使用哪個命令
if command -v libreoffice >/dev/null 2>&1; then
    LIBREOFFICE_CMD="libreoffice"
else
    LIBREOFFICE_CMD="soffice"
fi

COMMAND="$LIBREOFFICE_CMD --headless --convert-to pdf --outdir \"$TEST_DIR\" \"$TEST_DIR/test.rtf\""

# 執行轉換命令
if eval $COMMAND; then
    echo "✅ 轉換命令執行成功"
    
    # 檢查輸出檔案
    if [ -f "$TEST_DIR/test.pdf" ]; then
        echo "✅ PDF 檔案生成成功: $TEST_DIR/test.pdf"
        echo "📊 檔案大小: $(ls -lh "$TEST_DIR/test.pdf" | awk '{print $5}')"
    else
        echo "❌ PDF 檔案未生成"
        exit 1
    fi
else
    echo "❌ 轉換命令執行失敗"
    exit 1
fi

# 清理測試檔案
echo "🧹 清理測試檔案..."
rm -rf "$TEST_DIR"

echo "🎉 LibreOffice Word 轉 PDF 功能測試完成！"