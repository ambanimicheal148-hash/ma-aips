package ke.co.kais.app;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String API_URL = "https://ma-aips-ai.hatchable.site/api/kais-ai";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private LinearLayout messages;
    private EditText input;
    private Spinner language;
    private Button send;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildNativeUi();
    }

    private void buildNativeUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 16);
        root.setBackgroundColor(Color.WHITE);

        TextView title = new TextView(this);
        title.setText("K.AI.S");
        title.setTextSize(28);
        title.setTextColor(Color.rgb(3, 49, 70));
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 8, 0, 4);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Kenya AI Assistant Service");
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setTextColor(Color.DKGRAY);
        root.addView(subtitle, new LinearLayout.LayoutParams(-1, -2));

        language = new Spinner(this);
        String[] languages = {"English", "Kiswahili"};
        language.setAdapter(new ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, languages));
        root.addView(language, new LinearLayout.LayoutParams(-1, -2));

        ScrollView scroll = new ScrollView(this);
        messages = new LinearLayout(this);
        messages.setOrientation(LinearLayout.VERTICAL);
        messages.setPadding(0, 18, 0, 18);
        scroll.addView(messages);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout composer = new LinearLayout(this);
        composer.setOrientation(LinearLayout.HORIZONTAL);
        input = new EditText(this);
        input.setHint("Ask K.AI.S...");
        input.setSingleLine(false);
        send = new Button(this);
        send.setText("SEND");
        composer.addView(input, new LinearLayout.LayoutParams(0, -2, 1));
        composer.addView(send, new LinearLayout.LayoutParams(-2, -2));
        root.addView(composer, new LinearLayout.LayoutParams(-1, -2));

        send.setOnClickListener(v -> submit());
        input.setOnEditorActionListener((v, actionId, event) -> { submit(); return true; });
        addMessage("K.AI.S", "Habari. Mimi ni K.AI.S. Ninaweza kukusaidia kupata maelezo ya huduma za umma.");
        setContentView(root);
    }

    private void addMessage(String who, String text) {
        TextView view = new TextView(this);
        view.setText(who + ": " + text);
        view.setTextSize(16);
        view.setTextColor(Color.rgb(25, 25, 25));
        view.setPadding(8, 10, 8, 10);
        messages.addView(view);
    }

    private void submit() {
        String message = input.getText().toString().trim();
        if (message.isEmpty()) return;
        input.setText("");
        addMessage("You", message);
        send.setEnabled(false);
        send.setText("...");
        String lang = language.getSelectedItem().toString();
        executor.execute(() -> {
            String reply;
            try { reply = requestAI(message, lang); }
            catch (Exception e) { reply = "K.AI.S is temporarily unavailable. Please try again."; }
            final String result = reply;
            runOnUiThread(() -> {
                addMessage("K.AI.S", result);
                send.setEnabled(true);
                send.setText("SEND");
            });
        });
    }

    private String requestAI(String message, String languageName) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(API_URL).openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        JSONObject body = new JSONObject();
        body.put("message", message);
        body.put("language", languageName);
        body.put("service", "General public service");
        byte[] data = body.toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream out = c.getOutputStream()) { out.write(data); }
        int status = c.getResponseCode();
        InputStream stream = status >= 400 ? c.getErrorStream() : c.getInputStream();
        if (stream == null) throw new Exception("No response");
        StringBuilder result = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line; while ((line = r.readLine()) != null) result.append(line);
        }
        if (status < 200 || status >= 300) throw new Exception("HTTP " + status);
        JSONObject json = new JSONObject(result.toString());
        return json.optString("text", json.optString("assistant", "No response received."));
    }

    @Override protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
