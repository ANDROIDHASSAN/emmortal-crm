import { useRef } from 'react';

// Picks a file and calls onUpload(FormData) with field name 'file'.
export default function FileUpload({ accept, label = 'Choose file', onUpload, busy }) {
  const ref = useRef();
  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    onUpload(fd);
    e.target.value = '';
  };
  return (
    <>
      <button type="button" className="btn-ghost" disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : label}</button>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={pick} />
    </>
  );
}
