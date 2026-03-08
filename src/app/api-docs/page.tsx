"use client";

import { useEffect, useRef } from "react";

export default function ApiDocsPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>MONEMORY API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: "/api/api-docs", dom_id: "#swagger-ui" });
  </script>
</body>
</html>`;
      iframeRef.current.srcdoc = html;
    }
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className="w-full min-h-screen border-0"
      title="API Documentation"
    />
  );
}
