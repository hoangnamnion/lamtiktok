import fs from 'node:fs';
import path from 'node:path';

const plistPath = path.join(process.cwd(), 'ios', 'App', 'App', 'Info.plist');

if (fs.existsSync(plistPath)) {
  let content = fs.readFileSync(plistPath, 'utf8');

  const keysToAdd = `
	<key>NSPhotoLibraryUsageDescription</key>
	<string>Ứng dụng cần quyền lưu ảnh status TikTok vào Thư viện ảnh của bạn.</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>Ứng dụng cần quyền lưu ảnh status TikTok vào Thư viện ảnh của bạn.</string>
</dict>
</plist>`;

  if (!content.includes('NSPhotoLibraryAddUsageDescription')) {
    content = content.replace(/<\/dict>\s*<\/plist>/gi, keysToAdd);
    fs.writeFileSync(plistPath, content, 'utf8');
    console.log('✓ Đã chèn thành công NSPhotoLibraryUsageDescription & NSPhotoLibraryAddUsageDescription vào Info.plist');
  } else {
    console.log('ℹ Info.plist đã có sẵn quyền Thư viện ảnh.');
  }
} else {
  console.warn('⚠️ Không tìm thấy file Info.plist tại:', plistPath);
}
