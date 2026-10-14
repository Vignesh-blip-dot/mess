import fs from 'fs';
let schema = fs.readFileSync('supabase_schema.sql', 'utf8');

schema = schema.replace(
`    if v_role = 'admin' then
        return 'edit';
    elsif v_role = 'incharge' then
        return 'edit';
    end if;`,
`    if v_role = 'admin' then
        return 'edit';
    elsif v_role = 'incharge' then
        return 'view';
    end if;`
);

fs.writeFileSync('supabase_schema.sql', schema);
