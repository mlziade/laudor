-- Recreate Perfil table: replace fullName with firstName/lastName, add cellphone and customFields
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Perfil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "firstName" TEXT,
    "lastName" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "cellphone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "picture" TEXT,
    "customFields" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Perfil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Perfil" (
    "id", "userId", "name", "description", "tags",
    "firstName", "lastName", "cpf", "rg", "email",
    "phone", "cellphone", "cep", "logradouro", "numero",
    "complemento", "bairro", "cidade", "estado", "picture",
    "customFields", "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "name", "description", "tags",
    "fullName", NULL, "cpf", "rg", "email",
    "phone", NULL, "cep", "logradouro", "numero",
    "complemento", "bairro", "cidade", "estado", "picture",
    '[]', "createdAt", "updatedAt"
FROM "Perfil";

DROP TABLE "Perfil";
ALTER TABLE "new_Perfil" RENAME TO "Perfil";

PRAGMA foreign_keys=ON;
