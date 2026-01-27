use std::mem;
use std::slice;
use std::str;

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(len);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn handle(ptr: *mut u8, len: usize) -> u64 {
    let input_slice = slice::from_raw_parts(ptr, len);
    let input_str = str::from_utf8(input_slice).unwrap_or("{}");
    
    // Simple logic: echo input with a greeting
    // In a real application, you would parse the JSON input.
    // Here we just construct a JSON-like string manually.
    
    let output = format!(r#"{{\"message\": \"Hello from Rust WASM!\", \"input\": \"{}\"}}"#, input_str.replace("\"", "\\\""));
    let output_bytes = output.as_bytes();
    let out_len = output_bytes.len();
    let out_ptr = alloc(out_len);
    
    std::ptr::copy_nonoverlapping(output_bytes.as_ptr(), out_ptr, out_len);
    
    ((out_ptr as u64) << 32) | (out_len as u64)
}
