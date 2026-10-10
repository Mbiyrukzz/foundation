import type { Schema, CreateTableBuilder } from "@tylix/shared";

export const up = async (schema: Schema) => {
    await schema.createTable("contacts", (table: CreateTableBuilder) => {
        table.increments("id");
        table.string("name");
        table.string("email");
        table.string("phone");
        table.string("subject");
        table.text("message");
        table.timestamps();
    });
};

export const down = async (schema: Schema) => {
    await schema.dropTable("contacts");
};