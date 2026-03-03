# 开发运行笔记

## 从 WSL 启动完整 Tauri GUI

```bash
powershell.exe -Command "\$env:PATH += ';C:\Users\waylon_pc\.cargo\bin'; cd D:\workspace\Pandora; npm run tauri dev"
```

注意：需要手动把 cargo bin 加到 PATH，因为 WSL 调用 PowerShell 时不继承 Windows 用户 PATH。
如果端口 1420 被占用，先清理：
```bash
powershell.exe -Command "Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```
