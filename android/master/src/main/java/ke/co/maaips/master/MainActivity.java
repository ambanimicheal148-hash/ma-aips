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

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildUi();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 16);
        root.setBackgroundColor(Color.WHITE);

        TextView title = new TextView(this);
        title.setText("MASTER AI");
        title.setTextSize(28);
        title.setTextColor(Color.rgb(3, 49, 70));
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("MA.AI.P.S Executive Commander • CEO Access");
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setTextColor(Color.DKGRAY);
        subtitle.setPadding(0, 4, 0, 12);
        root.addView(subtitle, new LinearLayout.LayoutParams(-1, -2));

        ScrollView scroll = new ScrollView(this);
        messages = new LinearLayout(this);
        messages.setOrientation(LinearLayout.VERTICAL);
        messages.setPadding(0, 12, 0, 12);
        scroll.addView(messages);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout composer = new LinearLayout(this);
        input = new EditText(this);
        input.setHint("Give MASTER AI a command...");
        input.setSingleLine(false);
        Button button = new Button(this);
        button.setText("SEND");
        composer.addView(input, new LinearLayout.LayoutParams(0, -2, 1));
        composer.addView(button, new LinearLayout.LayoutParams(-2, -2));
        root.addView(composer);
        button.setOnClickListener(v -> submit(button));

        addMessage("MASTER AI", "CEO command center ready. Access is enforced by the MA.AI.P.S executive backend.");
        setContentView(root);
    }

    private void addMessage(String who, String text) {
        TextView v = new TextView(this);
        v.setText(who + ": " + text);
        v.setTextSize(16);
        v.setTextColor(Color.rgb(25,25,25));
        v.setPadding(8, 10, 8, 10);
        messages.addView(v);
    }

    private void submit(Button button) {
        String command = input.getText().toString().trim();
        if (command.isEmpty()) return;
        input.setText("");
        addMessage("CEO", command);
        button.setEnabled(false);
        button.setText("...");
        executor.execute(() -> {
            String reply;
            try { reply = requestMaster(command); }
            catch (Exception e) { reply = "MASTER AI is unavailable or this device is not authenticated for CEO access."; }
            final String result = reply;
            runOnUiThread(() -> { addMessage("MASTER AI", result); button.setEnabled(true); button.setText("SEND"); });
        });
    }

    private String requestMaster(String command) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(API_URL).openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        JSONObject body = new JSONObject();
        body.put("command", command);
        try (OutputStream out = c.getOutputStream()) { out.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        int status = c.getResponseCode();
        InputStream stream = status >= 400 ? c.getErrorStream() : c.getInputStream();
        if (stream == null) throw new Exception("No response");
        StringBuilder result = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line; while ((line = r.readLine()) != null) result.append(line);
        }
        if (status < 200 || status >= 300) throw new Exception("HTTP " + status);
        JSONObject json = new JSONObject(result.toString());
        return json.optString("report", json.optString("error", "No executive response received."));
    }

    @Override protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
