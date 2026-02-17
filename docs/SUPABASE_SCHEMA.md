# Supabase schema (original setup)

## Tables the app uses

### `calendar_images`

| Column       | Type         | Description                          |
|-------------|--------------|--------------------------------------|
| `id`        | bigint (PK)  | Auto-generated row id                |
| `user_id`   | uuid         | From `auth.users`                    |
| `local_id`  | text         | App-generated image id               |
| `date_key`  | text         | `YYYY-MM-DD`                         |
| `uri`       | text         | Local file URI (or stored URL)       |
| `asset_id`  | text         | Optional device asset id             |
| `file_name` | text         | Optional file name                   |
| `label_id`  | text         | Optional label id                    |
| `updated_at`| timestamptz  | Last update time                     |

Enable RLS; allow `SELECT`, `INSERT`, `UPDATE`, `DELETE` for `auth.uid() = user_id`.

### `labels`

| Column       | Type        | Description        |
|-------------|-------------|--------------------|
| `id`        | text (PK)   | Label id           |
| `user_id`   | uuid        | From `auth.users`  |
| `name`      | text        | Label name         |
| `color`     | text        | Hex color          |
| `updated_at`| timestamptz | Last update time  |

Enable RLS; allow `SELECT`, `INSERT`, `UPDATE`, `DELETE` for `auth.uid() = user_id`.

---

## Revert DB: remove Google Photos columns

If you previously ran a migration that added `source` and `google_photo_id` to `calendar_images`, run this in the Supabase **SQL Editor** to revert to the original schema:

```sql
-- Remove Google Photos columns from calendar_images (revert to original setup)
ALTER TABLE calendar_images
DROP COLUMN IF EXISTS source;

ALTER TABLE calendar_images
DROP COLUMN IF EXISTS google_photo_id;
```

Then in **Table Editor** → **calendar_images**, confirm only the columns listed above (no `source`, no `google_photo_id`).
