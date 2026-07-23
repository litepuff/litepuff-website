import bcrypt from "bcrypt";

const password = "LitePuff@1234"; // The password you're typing

const hash = "$2a$12$Dgt.XfXZpUQS3HbdwRxR2eDN4B9G7zNnDfWvErh2DKpUZ17qwxgr0";

const result = await bcrypt.compare(password, hash);

console.log(result);