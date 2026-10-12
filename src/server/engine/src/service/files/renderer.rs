use crate::shared::{contracts::report::GenerateRequest, error::Fault};
fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('\"', "&quot;")
        .replace('\'', "&#39;")
}
pub fn render(request: &GenerateRequest) -> Result<(String, &'static str, &'static str), Fault> {
    match request.format.as_str() {
        "text" => Ok((
            format!("{}\n\n{}\n", request.title, request.content),
            "txt",
            "text/plain; charset=utf-8",
        )),
        "html" => Ok((
            format!(
                "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>{}</title><h1>{}</h1><pre>{}</pre></html>",
                escape(&request.title),
                escape(&request.title),
                escape(&request.content)
            ),
            "html",
            "text/html; charset=utf-8",
        )),
        _ => Err(Fault::invalid("format must be text or html")),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn html_escapes_content() {
        let r = GenerateRequest {
            title: "<script>".into(),
            content: "&\"".into(),
            format: "html".into(),
        };
        let (body, _, _) = render(&r).unwrap();
        assert!(!body.contains("<script>"));
        assert!(body.contains("&amp;&quot;"));
    }
}
