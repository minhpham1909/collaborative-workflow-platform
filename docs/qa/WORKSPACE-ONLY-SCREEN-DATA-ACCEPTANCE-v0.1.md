# Workspace-only — checklist nghiệm thu dữ liệu màn hình

12/10/2026. **Chưa chạy kiểm thử; toàn bộ các mục dưới là kế hoạch/pending**. Dùng [read API draft](../sds/WORKSPACE-ONLY-READ-API-DRAFT-v0.1.md) và [screen spec](../project/WORKSPACE-ONLY-SCREEN-DATA-SPEC-v0.1.md). Không dùng pass của UI cũ để đóng các mục refactor mới.

| Mã | Khung / fixture cần | BE phải kiểm | UI phải kiểm |
| --- | --- | --- | --- |
| DATA-01 | Home không Workspace/Task/Inbox | Counts0 với request thành công | Empty CTA đúng, không fake progress/activity |
| DATA-02 | Home 2Task overdue hôm nay,1overdue hôm qua,1due hôm nay sắp tới | Today=3,overdue=3,union=4 theo rule draft | Không cộng6; click Today đúng3Tasks |
| DATA-03 | Priority có3priority khác nhau, nhiều deadlines | Rule sort deterministic/full matchingTotal | Tối đa số rows bounded, link “xem tất cả” đúng scope |
| DATA-04 | Workspace>1page, roles/states/search chồng | Total/facets độc lập limit và cursor | Search full-set; mode switch không reset filter |
| DATA-05 | Archived Workspace có2Active và1Archived Project | Counts2/1,readonly riêng | Không render0Active vì parent Archive; card đọc được |
| DATA-06 | Workspace mới chỉname | Defaults/null/setup derived đúng | Optional setup không khóa Project tạo đầu tiên |
| DATA-07 | Name dài/Việt/punctuation-only,summary null/long | Validation/raw name preserved | Initials bỏ ký tự; icon fallback; truncate/expand hợp lệ |
| DATA-08 | Empty/large Project,mixed states/Task trash | Done/total full non-trash;0denominator | Empty progress text, không Sprint badge giả |
| DATA-09 | Board3cột mỗi cột>page,query+labels | Column totals filtered; global stats không filter; cursors độc lập | Load cộtA không append vàoB; counts không items.length |
| DATA-10 | TaskList payload có longdescription/checklist | List omit rich bodies; summaries accurate batch | Card không cần detail fetch trước để dựng hàng |
| DATA-11 | Detail legacy code/completedAt null,due null | Null semantics,Done not overdue | Không fake mã/ngày xong; “Không hạn/Chưa phân công” |
| DATA-12 | Done assignee đã rời/Guest view | Scoped relation/profile; không private email/Ban reason | Hover/focus profile, giữ layout, không tag dài |
| DATA-13 | Comments>page,delete/newcomment | Full count/cursor,author actions | Count header không page length; draft giữ khi background read |
| DATA-14 | Team nhiềuManagers/roles,search | Unique active count,role filters/targetcaps đúng | Picker search server; peer Manager controls bị chặn |
| DATA-15 | Invitation email/link/expiry/deliveryerror | List token absent,recipient scoped | SMTP accepted không “đã nhận thư”; đúng Member/Guest wording |
| DATA-16 | MyTasks future>7days,done/noDeadline | Group definitions đúng;globalcursor không giả groupcursor | Không label upcoming=7days;card và row khác cấu trúc hữu ích |
| DATA-17 | Calendar boundary GMT+7/leap/null deadline | Month/day cùng scope,total full-set | Loading“—”,zero sau success; không meeting card giả |
| DATA-18 | Inbox unavailabletarget/unread/filter/signedcutoff | Redaction/count/currentscope,cutoff không đổi giữa confirm | Không stale name/body;list mode cùng actions/data |
| DATA-19 | Legacy trash purgeAt null;parent Archived | Restoreeligibility/reason/legacy semantics | Không countdown30days bịa; không CTA restore không khả dụng |
| DATA-20 | One block networkfail,late response/account switch | Errors không fallback0,auth scoped | Homepartialerror,preserve permitteddraft;oldresponse không đè accountmới |
| DATA-21 | Managerdemotion/transfer/Ban khi form mở | Auth fence/CAS/role recheck | Controls refresh,currentrights;pending no blindretry |
| DATA-22 | Mutation Taskstatus/deadline/delete | Counts/readmodels đúng sau invalidation | Board/Home/MyTasks/Calendar cập nhật sau reads, không claim realtime |

Mỗi hàng cần ghi fixture ID/scoped endpoint/result/screenshots khi thực thi. Chạy fixture isolated, không bơm/xóa dữ liệu user thật hoặc phát email. Light/Dark,Vi/En và desktop/mobile dùng cùng assertions nghiệp vụ; screenshots kiểm layout không thay assertion số liệu/quyền. Browser QA sau BE contract tests; audit performance list projections và query counts, không N+1 percard.

Các policy pending phải chốt trước test implementation; expected kết quả ở bảng là theo draft hiện tại, chưa bằng quyết định sản phẩm đã duyệt. Không deploy/migration/dev workers trong gate này.
