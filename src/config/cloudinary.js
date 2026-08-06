import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// The SDK auto-configures itself from process.env.CLOUDINARY_URL — no manual
// cloud_name/api_key/api_secret parsing needed.
export default cloudinary;
