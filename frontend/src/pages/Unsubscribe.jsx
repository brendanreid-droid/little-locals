import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam.trim().toLowerCase());
      setPrefilled(true);
    }
  }, [searchParams]);

  const handleUnsubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const emailClean = email.trim().toLowerCase();
      
      // Perform the deletion directly on Firestore client SDK
      await deleteDoc(doc(db, 'subscribers', emailClean));
      
      setSuccess(true);
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setError(err.message || 'Failed to unsubscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '80px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', backgroundColor: 'var(--bg-cream)' }}>
      
      <div 
        className="sticker-shadow"
        style={{ 
          backgroundColor: 'var(--bg-white)', 
          border: '3.5px solid var(--text-dark)', 
          borderRadius: '32px',
          padding: '48px 32px',
          boxShadow: '8px 8px 0px 0px var(--text-dark)',
          width: '100%',
          maxWidth: '480px',
          textAlign: 'center',
          animation: 'slideUp 0.35s ease'
        }}
      >
        
        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'slideUp 0.3s ease' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'var(--primary-soft)', border: '2.5px solid var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CheckCircle size={36} />
            </div>
            
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: 'var(--primary)', margin: '0 0 8px 0' }}>
                Unsubscribed
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: '1.6', fontWeight: '600' }}>
                We're sorry to see you go! <strong>{email}</strong> has been successfully removed from our monthly newsletter list.
              </p>
            </div>
            
            <Link 
              to="/" 
              style={{
                marginTop: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontWeight: '900',
                fontSize: '0.9rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: '3px solid var(--text-dark)',
                borderRadius: '50px',
                boxShadow: '3px 3px 0px 0px var(--text-dark)',
                textDecoration: 'none',
                transition: 'var(--transition-bouncy)'
              }}
            >
              Back to Home Directory <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: 'var(--primary)', margin: '0 0 8px 0' }}>
                Unsubscribe
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: '600', margin: 0 }}>
                Cancel your subscription to the Little Locals monthly kids activities & events scoop.
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'hsl(0, 100%, 97%)', border: '2.5px solid hsl(0, 100%, 80%)', padding: '14px 18px', borderRadius: '16px', color: 'hsl(0, 80%, 35%)', fontSize: '0.88rem', fontWeight: '700', animation: 'slideUp 0.3s ease' }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUnsubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="email" style={{ fontWeight: '800' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail 
                    style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
                    size={18} 
                  />
                  <input 
                    type="email" 
                    id="email" 
                    placeholder="your.email@example.com" 
                    required
                    className="form-control"
                    style={{ 
                      paddingLeft: '48px', 
                      border: '3px solid var(--text-dark)', 
                      boxShadow: 'none',
                      backgroundColor: 'var(--bg-cream)'
                    }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || prefilled}
                  />
                </div>
                {prefilled && (
                  <button 
                    type="button" 
                    onClick={() => setPrefilled(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.78rem', fontWeight: '800', marginTop: '6px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Change email address
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontWeight: '900',
                  fontSize: '1rem',
                  backgroundColor: 'var(--secondary)',
                  color: 'white',
                  border: '3px solid var(--text-dark)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  boxShadow: '4px 4px 0px 0px var(--text-dark)',
                  transition: 'var(--transition-bouncy)',
                  marginTop: '8px',
                  textAlign: 'center'
                }}
              >
                {loading ? 'Processing...' : 'Confirm Unsubscribe'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'underline' }}>
                Keep my subscription and go back
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
