import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });


async function test() {
  try {
    const res = await axios.post(
      `http://localhost:${process.env.PORT}/auth/signup`,
      {
        username: 'test1',
        email:    'email',
        password: 'password'
      }
    );
    console.log(res.data);    
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}

test();
