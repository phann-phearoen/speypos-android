import re
import json
import os

SQL_FILE = '/Users/phearoenphann/Ryong/speypos-android/android-shell/docs/sample-menu.sql'
OUTPUT_FILE = '/Users/phearoenphann/Ryong/speypos-android/android-shell/docs/sample-menu-migration.json'

TABLE_MAP = {
    "MenuCategory": "native.menu.categories.json",
    "MenuItem": "native.menu.items.json",
    "MenuItemCategoryMap": "native.menu.item.category.mappings.json",
    "CustomizationOptionGroup": "native.customization.groups.json",
    "CustomizationOption": "native.customization.options.json",
    "MenuItemCustomizationGroup": "native.menu.item.customization.mappings.json",
    "ToppingGroup": "native.topping.groups.json",
    "ToppingOption": "native.topping.options.json",
    "MenuCategoryToppingGroup": "native.menu.category.topping.mappings.json",
}

def parse_sql():
    if not os.path.exists(SQL_FILE):
        print(f"Error: {SQL_FILE} not found")
        return

    with open(SQL_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    results = {}
    pattern = re.compile(r'INSERT INTO "(\w+)" \((.*?)\) VALUES \((.*?)\);', re.S)

    for match in pattern.finditer(content):
        table_name = match.group(1)
        if table_name not in TABLE_MAP:
            continue

        columns = [c.strip().replace('"', '') for c in match.group(2).split(',')]
        raw_values = match.group(3)

        # Regex to split by comma but ignore commas inside single quotes
        values_list = re.findall(r"(?:'[^']*'|[^,]+)", raw_values)

        parsed_row = {}
        for i, val in enumerate(values_list):
            val = val.strip()
            if val.startswith("'") and val.endswith("'"):
                val = val[1:-1].replace("''", "'")
            elif val == "NULL":
                val = None
            elif val.replace('.', '', 1).isdigit():
                if '.' in val:
                    val = float(val)
                else:
                    val = int(val)

            # Map column names if they differ slightly (e.g. Kotlin expects 'name', SQL has 'name')
            # In our case they match.
            parsed_row[columns[i]] = val

        pref_key = TABLE_MAP[table_name]
        if pref_key not in results:
            results[pref_key] = []
        results[pref_key].append(parsed_row)

    # Wrap in preference format
    migration_data = {}
    for key, items in results.items():
        migration_data[key] = json.dumps(items, ensure_ascii=False)

    payload = {
        "version": 1,
        "mode": "menu",
        "exported_at": 0,
        "data": migration_data
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {OUTPUT_FILE}")

if __name__ == "__main__":
    parse_sql()
