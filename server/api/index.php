<?php
// Proxy PHP para encaminhar chamadas de /server/api/* para a API externa.
// Defina a URL base da API pública. Você pode usar variável de ambiente TARGET_API_BASE no cPanel.
$TARGET = getenv('TARGET_API_BASE') ?: 'https://api.branddesigner.com.br';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\') . '/';

// Subcaminho depois de /server/api/
$sub = '';
if ($scriptDir && strpos($path, $scriptDir) === 0) {
  $sub = substr($path, strlen($scriptDir));
}

// Health-check local (não encaminha para a API externa)
if (preg_match('#^health/?$#i', trim($sub, '/'))) {
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');
  http_response_code(200);
  echo json_encode(['status' => 'ok', 'target' => $TARGET]);
  exit;
}

$query = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] ? ('?' . $_SERVER['QUERY_STRING']) : '';
$url = rtrim($TARGET, '/') . '/' . ltrim($sub, '/') . $query;

// Corpo da requisição
$body = file_get_contents('php://input');

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Encaminhar cabeçalhos (exceto Host)
$forward = [];
if (function_exists('getallheaders')) {
  foreach (getallheaders() as $k => $v) {
    if (strtolower($k) === 'host') continue;
    $forward[] = "$k: $v";
  }
}
// Garantir Content-Type se não vier
$hasContentType = false;
foreach ($forward as $h) {
  if (stripos($h, 'Content-Type:') === 0) { $hasContentType = true; break; }
}
if (!$hasContentType) {
  $forward[] = 'Content-Type: application/json';
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $forward);

// Enviar corpo para métodos não-GET
if ($method === 'OPTIONS') {
  // Responder preflight CORS rapidamente
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Headers: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  http_response_code(204);
  exit;
}

if ($method !== 'GET' && $method !== 'HEAD') {
  curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
  $err = curl_error($ch);
  $errno = curl_errno($ch);
  curl_close($ch);
  http_response_code(502);
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');
  echo json_encode(['error' => 'Bad Gateway', 'message' => $err, 'code' => $errno]);
  exit;
}

$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$respBody = substr($response, $headerSize);
http_response_code($code ?: 200);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo $respBody;