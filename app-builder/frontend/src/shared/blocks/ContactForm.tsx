import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { submitPublicProjectForm } from '../../api';

function Field({
  label,
  value,
  multiline,
  editable,
  onChangeText,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  editable: boolean;
  onChangeText: (next: string) => void;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#334155' }}>{label}</Text>
      <TextInput
        editable={editable}
        multiline={multiline}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#94a3b8"
        style={{
          borderWidth: 1,
          borderColor: '#cbd5e1',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 10,
          minHeight: multiline ? 100 : undefined,
          backgroundColor: editable ? '#ffffff' : '#f8fafc',
          color: '#0f172a',
          textAlignVertical: multiline ? 'top' : 'auto',
        }}
      />
    </View>
  );
}

export function ContactForm({
  title,
  subtitle,
  submitLabel,
  successMessage,
  showName,
  showEmail,
  showPhone,
  showMessage,
  blockId,
  projectId,
  previewMode,
}: {
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  successMessage?: string;
  showName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showMessage?: boolean;
  blockId?: string;
  projectId?: string;
  previewMode?: boolean;
}) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [status, setStatus] = React.useState<{ kind: 'idle' | 'success' | 'error'; text: string }>({ kind: 'idle', text: '' });
  const [submitting, setSubmitting] = React.useState(false);

  const hasSavedProject = typeof projectId === 'string' && /^[0-9a-fA-F]{24}$/.test(projectId);
  const canSubmit = Boolean(previewMode && hasSavedProject && blockId);

  async function handleSubmit() {
    if (!canSubmit || !projectId || !blockId || submitting) return;
    setSubmitting(true);
    setStatus({ kind: 'idle', text: '' });

    try {
      await submitPublicProjectForm(projectId, blockId, {
        name: showName ? name : undefined,
        email: showEmail ? email : undefined,
        phone: showPhone ? phone : undefined,
        message: showMessage ? message : undefined,
      });
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setStatus({ kind: 'success', text: successMessage || 'Form submitted successfully.' });
    } catch (err: any) {
      setStatus({ kind: 'error', text: err?.message || 'Failed to submit form.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View
      style={{
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 18,
        backgroundColor: '#f8fafc',
      }}
    >
      {title ? <Text style={{ fontSize: 24, fontWeight: '700', color: '#0f172a' }}>{title}</Text> : null}
      {subtitle ? <Text style={{ marginTop: 6, fontSize: 14, color: '#475569', lineHeight: 20 }}>{subtitle}</Text> : null}

      {showName ? <Field label="Name" value={name} editable={canSubmit} onChangeText={setName} /> : null}
      {showEmail ? <Field label="Email" value={email} editable={canSubmit} onChangeText={setEmail} /> : null}
      {showPhone ? <Field label="Phone" value={phone} editable={canSubmit} onChangeText={setPhone} /> : null}
      {showMessage ? <Field label="Message" value={message} multiline editable={canSubmit} onChangeText={setMessage} /> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{
          marginTop: 14,
          backgroundColor: !canSubmit || submitting ? '#94a3b8' : '#0f172a',
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
          {submitting ? 'Submitting...' : submitLabel || 'Submit'}
        </Text>
      </Pressable>

      {status.text ? (
        <Text
          style={{
            marginTop: 10,
            fontSize: 13,
            color: status.kind === 'error' ? '#b91c1c' : '#166534',
          }}
        >
          {status.text}
        </Text>
      ) : null}

      {!canSubmit ? (
        <Text style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
          Switch to preview mode with a saved project to submit this form.
        </Text>
      ) : null}
    </View>
  );
}
