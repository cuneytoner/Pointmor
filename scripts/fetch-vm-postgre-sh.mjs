/**
 * VM'den postgre.sh içeriğini okur (ssh2, şifre ile).
 * Env: VM_HOST, VM_USER, VM_PASSWORD, VM_POSTGRE_SH
 */
import { Client } from "ssh2";

const config = {
  host: process.env.VM_HOST ?? "192.168.122.50",
  username: process.env.VM_USER ?? "cc",
  password: process.env.VM_PASSWORD ?? "cc",
};

const remotePath = process.env.VM_POSTGRE_SH ?? "/docker/postgresql/postgre.sh";

function runCat(path) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(`cat '${path.replace(/'/g, "'\\''")}'`, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          let out = "";
          let errOut = "";
          stream
            .on("close", (code) => {
              conn.end();
              if (code !== 0) {
                reject(new Error(errOut || `exit ${code}`));
                return;
              }
              resolve(out);
            })
            .on("data", (d) => {
              out += d.toString();
            });
          stream.stderr.on("data", (d) => {
            errOut += d.toString();
          });
        });
      })
      .on("error", reject)
      .connect(config);
  });
}

try {
  let text;
  try {
    text = await runCat(remotePath);
  } catch (e) {
    const alt = "/docker/postgresql/postgres.sh";
    if (remotePath !== alt) {
      console.error(`// ${remotePath} okunamadı, ${alt} deneniyor...`, e.message);
      text = await runCat(alt);
    } else {
      throw e;
    }
  }
  process.stdout.write(text);
} catch (e) {
  console.error(e);
  process.exit(1);
}
