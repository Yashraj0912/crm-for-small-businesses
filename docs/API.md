# API summary

Base path `/api`. Send `Authorization: Bearer <token>` on everything except register, login and health. Errors: `{"detail": "..."}` with 401, 403, 404, 409 or 422.
List endpoints take `page`, `page_size` and `q`, and return `{items, total, page, page_size}`.

| Method and path | Purpose | Who |
|---|---|---|
| POST `/auth/register` | Create organization + admin (if enabled) | public |
| POST `/auth/login` | Get token | public |
| GET `/auth/me` | Current user | any |
| GET `/dashboard` | Counters, pipeline, revenue by month, recent activity, upcoming tasks | any |
| GET `/users` | Team with 30-day activity counts | any |
| POST `/users`, PUT `/users/{id}` | Add / edit member (role, active, password) | admin |
| GET `/lookup/customers`, `/lookup/deals` | id + name lists for dropdowns | any |
| GET, POST `/customers` | List (`q`, `category`, `owner_id`, `tag`) / create | any |
| GET, PUT `/customers/{id}` | Read / update | any |
| DELETE `/customers/{id}` | Delete | admin |
| GET, POST `/leads` | List (`status`, `source`, `assigned_to`) / create | any |
| PUT `/leads/{id}` | Update | any |
| POST `/leads/{id}/convert` | Create customer from lead | any |
| DELETE `/leads/{id}` | Delete | admin |
| GET, POST `/deals` | List (`stage`, `customer_id`, `owner_id`; up to 300 per page) / create | any |
| PUT `/deals/{id}`, PATCH `/deals/{id}/stage` | Update / move stage (sets `closed_at` on won or lost) | any |
| DELETE `/deals/{id}` | Delete | admin |
| GET, POST `/tasks` | List (`status`, `priority`, `assigned_to`, `customer_id`, `deal_id`) / create | any |
| PUT, DELETE `/tasks/{id}`, POST `/tasks/{id}/toggle` | Update / delete / mark done or pending | any |
| GET, POST `/activities` | List (`customer_id`, `deal_id`, `type`) / log call, meeting, email or note | any |
| PUT, DELETE `/activities/{id}` | Update / delete | any |
| GET `/health` | Liveness | public |

Update endpoints are full replacements of the editable fields (send the whole object).
