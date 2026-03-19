import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { createChest, getChest, updateChest } from '../../api/chests';
import api from '../../api/client';
import { swal } from '../../utils/swal';


export default function ChestForm() {
  const { id }    = useParams();
  const isEdit    = Boolean(id);
  const navigate  = useNavigate();

  const [name,       setName]       = useState('');
  const [imageUrl,   setImageUrl]   = useState<string | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [coinType,   setCoinType]   = useState<'gold' | 'silver' | 'bronze'>('gold');
  const [priceBrl,   setPriceBrl]   = useState('');
  const [status,     setStatus]     = useState<'active' | 'inactive'>('active');
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getChest(Number(id)).then(c => {
      setName(c.name);
      setImageUrl(c.image_url ?? null);
      setPreviewSrc(c.image_url ?? null);
      setCoinAmount(String(c.coin_amount));
      setCoinType(c.coin_type as 'gold' | 'silver' | 'bronze');
      setPriceBrl(String(c.price_brl));
      setStatus(c.status);
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewSrc(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post<{ url: string }>('/upload/chest-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(data.url);
    } catch (err: any) {
      swal.error('Erro no upload', err.response?.data?.error || 'Não foi possível enviar a imagem.');
      setPreviewSrc(imageUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setPreviewSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setSaving(true);
    try {
      const payload = {
        name,
        image_url: imageUrl ?? null,
        coin_amount: parseFloat(coinAmount),
        coin_type: coinType,
        price_brl: parseFloat(priceBrl),
        status,
      };
      if (isEdit) {
        await updateChest(Number(id), payload);
      } else {
        await createChest(payload);
      }
      await swal.success(isEdit ? 'Baú atualizado!' : 'Baú criado!');
      navigate('/cobranca/baus');
    } catch (err: any) {
      swal.error('Erro ao salvar', err.response?.data?.error || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout title="Baú de Moedas"><p>Carregando...</p></Layout>;

  return (
    <Layout title={isEdit ? 'Editar Baú' : 'Novo Baú'}>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-header">
          <h2>{isEdit ? 'Editar Baú de Moedas' : 'Novo Baú de Moedas'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label>Nome <span className="req">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Cobre" required />
            </div>

            <div className="form-group">
              <label>Imagem do Baú</label>

              {previewSrc ? (
                <div className="chest-img-upload-preview">
                  <img src={previewSrc} alt="Preview da imagem do baú" />
                  {uploading && <div className="chest-img-uploading">Enviando...</div>}
                  <button
                    type="button"
                    className="chest-img-remove"
                    onClick={handleRemoveImage}
                    title="Remover imagem"
                  >✕</button>
                </div>
              ) : (
                <label className="chest-img-dropzone" htmlFor="chest-img-input">
                  {uploading ? (
                    <span>Enviando imagem...</span>
                  ) : (
                    <>
                      <span className="chest-img-dropzone-icon">📁</span>
                      <span>Clique para selecionar uma imagem</span>
                      <small>PNG, JPG, WebP, GIF ou SVG — máx. 2 MB</small>
                    </>
                  )}
                </label>
              )}

              <input
                id="chest-img-input"
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {previewSrc && !uploading && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Trocar imagem
                </button>
              )}

              <small style={{ color: '#9ca3af' }}>
                Deixe sem imagem para usar a ilustração padrão do sistema.
              </small>
            </div>

            <div className="form-group">
              <label>Tipo de Moeda <span className="req">*</span></label>
              <select value={coinType} onChange={e => setCoinType(e.target.value as 'gold' | 'silver' | 'bronze')}>
                <option value="gold">🟡 Ouro</option>
                <option value="silver">⚪ Prata</option>
                <option value="bronze">🟤 Cobre</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quantidade de Moedas <span className="req">*</span></label>
                <input
                  type="number" step="0.0000001" min="0.0000001"
                  value={coinAmount} onChange={e => setCoinAmount(e.target.value)}
                  placeholder="Ex: 9.0000000" required
                />
                <small>Moedas que o cliente receberá ao adquirir este baú</small>
              </div>
              <div className="form-group">
                <label>Preço (R$) <span className="req">*</span></label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={priceBrl} onChange={e => setPriceBrl(e.target.value)}
                  placeholder="Ex: 6.00" required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/cobranca/baus')}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                {uploading ? 'Aguarde o upload...' : saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Baú'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
