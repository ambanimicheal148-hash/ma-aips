package ke.co.maaips.master;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String API_URL = "https://ma-aips-ai.hatchable.site/api/master-ai";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private LinearLayout messages;
    private EditText input;
    private Button send;
    private TextView status;
    private TextView council;
    private TextView security;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildWarRoom();
        refreshStatus();
    }

    private TextView label(String text, int size) {
        TextView v = new TextView(this);
        v.setText(text);
        v.setTextSize(size);
        v.setTextColor(Color.rgb(230, 238, 242));
        v.setPadding(12, 8, 12, 8);
        return v;
    }

    private void buildWarRoom() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(18, 18, 18, 14);
        root.setBackgroundColor(Color.rgb(8, 20, 28));

        TextView title = label("MASTER AI WAR ROOM", 25);
        title.setGravity(Gravity.CENTER);
        title.setTextColor(Color.WHITE);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView sub = label("MA.AI.PS • CEO COMMAND CENTER • PRIVATE", 12);
        sub.setGravity(Gravity.CENTER);
        root.addView(sub, new LinearLayout.LayoutParams(-1, -2));

        LinearLayout cards = new LinearLayout(this);
        cards.setOrientation(LinearLayout.VERTICAL);
        status = label("SYSTEM: CHECKING...", 14);
        council = label("COUNCIL: CHECKING...", 14);
        security = label("SECURITY: CHECKING...", 14);
        cards.addView(status);
        cards.addView(council);
        cards.addView(security);
        root.addView(cards);

        Button refresh = new Button(this);
        refresh.setText("REFRESH WAR ROOM");
        refresh.setOnClickListener(v -> refreshStatus());
        root.addView(refresh, new LinearLayout.LayoutParams(-1, -2));

        ScrollView scroll = new ScrollView(this);
        messages = new LinearLayout(this);
        messages.setOrientation(LinearLayout.VERTICAL);
        messages.setPadding(0, 10, 0, 10);
        scroll.addView(messages);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout composer = new LinearLayout(this);
        composer.setOrientation(LinearLayout.HORIZONTAL);
        input = new EditText(this);
        input.setHint("CEO command...");
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(Color.LTGRAY);
        input.setSingleLine(false);
        send = new Button(this);
        send.setText("SEND");
        composer.addView(input, new LinearLayout.LayoutParams(0, -2, 1));
        composer.addView(send, new LinearLayout.LayoutParams(-2, -2));
        root.addView(composer);
        send.setOnClickListener(v -> submit());

        addMessage("MASTER AI", "War Room ready. CEO commands are sent only to the admin-gated MASTER AI backend.");
        setContentView(root);
    }

    private void addMessage(String who, String text) {
        TextView v = label(who + ": " + text, 15);
        v.setTextColor(Color.WHITE);
        messages.addView(v);
    }

    private void refreshStatus() {
        executor.execute(() -> {
            try {
                JSONObject json = request("GET", null);
                JSONObject snap = json.getJSONObject("snapshot");
                final String s = "SYSTEM: " + snap.optString("status") + " • " + snap.optString("pulse");
                JSONObject c = snap.optJSONObject("council");
                final String co = "COUNCIL: " + (c == null ? "UNKNOWN" : c.optString("quorum"));
                JSONObject sec = snap.optJSONObject("security_team");
                final String se = "SECURITY: " + (sec == null ? "UNKNOWN" : sec.optString("status"));
                runOnUiThread(() -> { status.setText(s); council.setText(co); security.setText(se); });
            } catch (Exception e) {
                runOnUiThread(() -> { status.setText("SYSTEM: CEO AUTHENTICATION REQUIRED"); council.setText("COUNCIL: LOCKED"); security.setText("SECURITY: BACKEND ENFORCED"); });
            }
        });
    }

    private void submit() {
        String command = input.getText().toString().trim();
        if (command.isEmpty()) return;
        input.setText("");
        addMessage("CEO", command);
        send.setEnabled(false);
        send.setText("...");
        executor.execute(() -> {
            String reply;
            try {
                JSONObject body = new JSONObject();
                body.put("command", command);
                JSONObject json = request("POST", body);
                reply = json.optString("report", json.optString("error", "No executive response."));
            } catch (Exception e) {
                reply = "CEO authentication is required for this War Room connection. The backend rejected the request safely.";
            }
            final String result = reply;
            runOnUiThread(() -> { addMessage("MASTER AI", result); send.setEnabled(true); send.setText("SEND"); });
        });
    }

    private JSONObject request(String method, JSONObject body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(API_URL).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("Accept", "application/json");
        if (body != null) {
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            try (OutputStream out = c.getOutputStream()) { out.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        }
        int statusCode = c.getResponseCode();
        InputStream stream = statusCode >= 400 ? c.getErrorStream() : c.getInputStream();
        if (stream == null) throw new Exception("No response");
        StringBuilder result = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line; while ((line = r.readLine()) != null) result.append(line);
        }
        if (statusCode < 200 || statusCode >= 300) throw new Exception("HTTP " + statusCode);
        return new JSONObject(result.toString());
    }

    @Override protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
