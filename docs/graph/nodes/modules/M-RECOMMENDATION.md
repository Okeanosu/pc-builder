---
id: M-RECOMMENDATION
type: module
title: "Module recommendation: API gợi ý cấu hình"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-ENGINE", "M-CATALOG", "E-PURPOSE-WEIGHT", "E-BUILD"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/recommendation/**"]
tests: ["apps/api/src/modules/recommendation/**/*.test.ts"]
diagrams: []
---

`recommendation.service.ts` kiểm tra request bằng `recommendationRequestSchema`, nạp ứng viên từ M-CATALOG (`getEngineCatalog`) và trọng số từ bảng `purpose_weights` (`profile.ts`, thiếu hoặc sai dạng thì dùng `DEFAULT_PROFILES` của Engine), gọi `solve`, lưu mọi build trả về qua M-BUILDS với nguồn do bên gọi truyền vào (FORM cho HTTP, CHAT cho chatbot). Kết quả (danh sách id build, `stats`, lý do không khả thi) được cache 10 phút ở `cache:reco:v{catalogVersion}:{sha1}`; lần gọi giống hệt trả lại đúng các build đã lưu. Đây cũng là nơi tool `recommend_builds` của chatbot gọi vào.

Băm được tính trên request đã chuẩn hóa (`recommendation.cache.ts`: sắp khóa, bỏ trường rỗng/undefined, sắp và khử trùng `exclude`) cùng nguồn build và chủ sở hữu, để một lần trúng cache không trả build của người khác.
