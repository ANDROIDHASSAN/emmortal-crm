import { useRef, useState } from 'react';

// Generic single-file upload that POSTs multipart/form-data via a passed mutation trigger.
export function FileUpload({ accept, label = 'Choose file', onUpload, fieldName = 'file', extraFields = {}, busy }) {
  const ref = useRef();
  const [name, setName] = useState('');

  const submit = async () => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append(fieldName, file);
    Object.entries(extraFields).forEach(([k, v]) => fd.append(k, v));
    await onUpload(fd);
    if (ref.current) ref.current.value = '';
    setName('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="btn-ghost cursor-pointer">
        {label}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => setName(e.target.files?.[0]?.name || '')} />
      </label>
      {name && <span className="text-sm text-slate-500">{name}</span>}
      <button className="btn-primary" disabled={!name || busy} onClick={submit}>{busy ? 'Uploading…' : 'Upload & Sync'}</button>
    </div>
  );
}

export default FileUpload;
