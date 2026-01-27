(module
  ;; 64KB memory
  (memory (export "memory") 1)

  ;; Global heap pointer
  (global $heap_ptr (mut i32) (i32.const 1024))

  ;; alloc(size: i32) -> i32
  (func (export "alloc") (param $size i32) (result i32)
    (local $ptr i32)
    (local.set $ptr (global.get $heap_ptr))
    (global.set $heap_ptr (i32.add (global.get $heap_ptr) (local.get $size)))
    (local.get $ptr)
  )

  ;; handle(ptr: i32, len: i32) -> i64
  ;; Returns: {"message":"hello from wasm"}
  (func (export "handle") (param $ptr i32) (param $len i32) (result i64)
    (local $out_ptr i32)
    (local $out_len i32)

    ;; Output: {"message":"hello from wasm"}
    ;; Length: 30 bytes
    (local.set $out_len (i32.const 30))

    ;; Allocate output buffer
    (local.set $out_ptr (call $alloc (local.get $out_len)))

    ;; Write JSON response byte by byte
    ;; {"message":"hello from wasm"}
    (i32.store8 (local.get $out_ptr) (i32.const 123))  ;; {
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 1)) (i32.const 34))   ;; "
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 2)) (i32.const 109))  ;; m
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 3)) (i32.const 115))  ;; s
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 4)) (i32.const 103))  ;; g
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 5)) (i32.const 34))   ;; "
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 6)) (i32.const 58))   ;; :
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 7)) (i32.const 34))   ;; "
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 8)) (i32.const 104))  ;; h
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 9)) (i32.const 101))  ;; e
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 10)) (i32.const 108)) ;; l
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 11)) (i32.const 108)) ;; l
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 12)) (i32.const 111)) ;; o
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 13)) (i32.const 32))  ;; (space)
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 14)) (i32.const 102)) ;; f
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 15)) (i32.const 114)) ;; r
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 16)) (i32.const 111)) ;; o
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 17)) (i32.const 109)) ;; m
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 18)) (i32.const 32))  ;; (space)
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 19)) (i32.const 119)) ;; w
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 20)) (i32.const 97))  ;; a
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 21)) (i32.const 115)) ;; s
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 22)) (i32.const 109)) ;; m
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 23)) (i32.const 34))  ;; "
    (i32.store8 (i32.add (local.get $out_ptr) (i32.const 24)) (i32.const 125)) ;; }

    ;; Return (ptr << 32) | len
    (i64.or
      (i64.shl (i64.extend_i32_u (local.get $out_ptr)) (i64.const 32))
      (i64.extend_i32_u (local.get $out_len))
    )
  )
)
