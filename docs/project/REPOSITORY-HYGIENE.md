# Quy tắc file trong repository

Ngày 03/10/2026. Root: README tổng quan, BE, FE, docs, scripts, packages, assets, infra và các cấu hình Git/editor dùng chung.

## Commit

- Source code, tests, scripts và cấu hình có thể tái sử dụng.
- package.json, pnpm-lock.yaml và pnpm-workspace.yaml: giữ phiên bản dependencies tái lập được.
- `.env.example` không có credential thật; hiện chỉ BE có template hoạt động, root placeholder đã bỏ.
- SRS/SDS, quyết định, kế hoạch, QA và archive có ý nghĩa với dự án. README cục bộ trong BE/FE, packages, assets và infra giữ tại thư mục liên quan.
- `.editorconfig`, `.gitattributes`, `.gitignore`; VS Code extensions/launch dùng chung có thể commit nhưng phải không chứa secret/đường dẫn cá nhân.

## Không commit

- node_modules, build/dist, cache/package stores và coverage/test reports được sinh tự động.
- `.env` thật và các biến thể local, private keys/certificate bundles, credential files riêng.
- Logs, temp/backup files, uploads, database files, dump/backup dữ liệu và `.local` scripts/runtime của phiên làm việc.
- Cấu hình IDE cá nhân (.idea, VS Code ngoài allowlist); không mở rộng ignore sang source/test fixtures/migrations chỉ vì chúng có tên data hoặc SQL.

## Kết quả rà soát

Commit khởi đầu có `.gitignore`; không thấy node_modules, `.local`, `.env` thật hoặc private key trong danh sách tracked. Các token hashes trong tests là fixture, không phải credential đăng nhập. Root `.env.example` chỉ chứa comment và trùng vai trò template BE, nên được bỏ khỏi version hiện tại.

`.gitignore` không tự bỏ theo dõi file đã commit. Khi phát hiện file không nên track, dùng git rm --cached với đường dẫn cụ thể nếu cần giữ local; không xóa source hàng loạt. Nếu tìm thấy secret thật từng lên Git, phải thu hồi/rotate và xử lý lịch sử riêng. Lần rà này không phát hiện credential thật trong các mẫu được kiểm tra; kiểm tra pattern không phải bằng chứng tuyệt đối mọi nội dung an toàn.

## Kiểm tra

Đã kiểm 17 đường dẫn phải ignore và 8 đường dẫn phải được phép commit; không có tracked files khớp ignore rules. Kiểm tra 90 local Markdown links và SRS consistency đều đạt ngày 03/10/2026. Không sửa logic backend trong lần sắp xếp này.

Từ root:

```powershell
git status --short
git ls-files --cached --ignored --exclude-standard
./scripts/check-doc-links.ps1
./scripts/check-srs.ps1
```

Đọc staged diff trước commit; chỉ đẩy những thay đổi đã kiểm tra. Báo cáo QA ghi kết quả kiểm thử nên giữ trong docs/qa; output chi tiết sinh tự động giữ local/CI artifacts.
