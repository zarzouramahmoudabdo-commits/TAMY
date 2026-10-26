package __PKG__;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject r = new JSObject();
        boolean ok = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        r.put("value", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null) { call.reject("no url"); return; }
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection c = null;
                try {
                    File dir = new File(getContext().getCacheDir(), "update");
                    dir.mkdirs();
                    File f = new File(dir, "update.apk");
                    if (f.exists()) f.delete();
                    String cur = url;
                    for (int i = 0; i < 6; i++) {
                        c = (HttpURLConnection) new URL(cur).openConnection();
                        c.setInstanceFollowRedirects(false);
                        c.setConnectTimeout(20000);
                        c.setReadTimeout(30000);
                        int code = c.getResponseCode();
                        if (code >= 300 && code < 400) {
                            String loc = c.getHeaderField("Location");
                            c.disconnect();
                            if (loc == null) throw new Exception("redirect without location");
                            cur = new URL(new URL(cur), loc).toString();
                            continue;
                        }
                        if (code != 200) throw new Exception("HTTP " + code);
                        break;
                    }
                    long total = c.getContentLengthLong();
                    InputStream in = c.getInputStream();
                    FileOutputStream out = new FileOutputStream(f);
                    byte[] buf = new byte[65536];
                    long done = 0, last = 0;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        done += n;
                        if (done - last > 262144) {
                            last = done;
                            JSObject p = new JSObject();
                            p.put("done", done);
                            p.put("total", total);
                            notifyListeners("progress", p);
                        }
                    }
                    out.close();
                    in.close();
                    if (f.length() < 1000000) throw new Exception("file too small: " + f.length());
                    JSObject r = new JSObject();
                    r.put("size", f.length());
                    call.resolve(r);
                } catch (Exception e) {
                    call.reject("download failed: " + e.getMessage());
                } finally {
                    if (c != null) c.disconnect();
                }
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        try {
            File f = new File(new File(getContext().getCacheDir(), "update"), "update.apk");
            if (!f.exists()) { call.reject("no file"); return; }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("install failed: " + e.getMessage());
        }
    }
}
