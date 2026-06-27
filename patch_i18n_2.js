const fs = require('fs');

function add(file, path, value) {
  let json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const parts = path.split('.');
  let curr = json;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!curr[parts[i]]) curr[parts[i]] = {};
    curr = curr[parts[i]];
  }
  curr[parts[parts.length - 1]] = value;
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

add('src/lib/i18n/fr.json', 'inventory.table_min_stock', 'Seuil min.');
add('src/lib/i18n/fr.json', 'inventory.btn_manage', 'Gérer →');

add('src/lib/i18n/en.json', 'inventory.table_min_stock', 'Min threshold');
add('src/lib/i18n/en.json', 'inventory.btn_manage', 'Manage →');

console.log("Patched additional translations");
