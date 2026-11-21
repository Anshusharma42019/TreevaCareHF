import React, { useState, useEffect } from 'react';
import { getOrder as fetchShipmaxxOrder, sendToVerification as smSendToVerification, saveOrderNote } from '../services/shipmaxx.service';
import { submitRtoVerification } from '../services/opsDashboard.service';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function RtoVerificationModal({ isOpen, onClose, shipment, onSuccess, onCommentAdded }) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [commentsList, setCommentsList] = useState([]);

  useEffect(() => {
    if (isOpen && shipment) {
      loadDetails();
      const initial = details?.comments || shipment?.comments || [];
      setCommentsList(Array.isArray(initial) ? initial : []);
    }
  }, [isOpen, shipment]);

  const loadDetails = async () => {
    setLoading(true);
    setDetails(null);
    try {
      const orderIdentifier = shipment._id || shipment.order_id || shipment.awb_code;
      const res = await fetchShipmaxxOrder(orderIdentifier);
      const data = res.data?.data || res.data;
      setDetails(data);
      if (Array.isArray(data?.comments)) {
        setCommentsList(data.comments);
      }
    } catch (err) {
      console.error(err);
      error('Failed to load full shipment details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const targetId = details?._id || shipment?._id || shipment?.order_id || shipment?.awb_code;
      const res = await saveOrderNote(targetId, commentText.trim(), 'general', 'rto_verification', user?.name, user?.role);
      const updated = res.data?.data || res.data;
      let newComments = [];
      if (Array.isArray(updated)) {
        newComments = updated;
      } else {
        newComments = [
          ...commentsList,
          {
            text: commentText.trim(),
            type: 'general',
            section: 'rto_verification',
            createdBy: { _id: user?._id || user?.id, name: user?.name || 'Staff', role: user?.role },
            creatorName: user?.name || 'Staff',
            creatorRole: user?.role,
            createdAt: new Date()
          }
        ];
      }
      setCommentsList(newComments);
      if (details) details.comments = newComments;
      if (shipment) shipment.comments = newComments;
      if (onCommentAdded) onCommentAdded(shipment.order_id, newComments);
      setCommentText('');
      success('Comment added successfully');
    } catch (err) {
      console.error(err);
      error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleVerification = async (action) => {
    setSubmitting(true);
    try {
      await submitRtoVerification({
        order_id: shipment.order_id,
        platform: shipment.platform,
        action,
      });
      success(action === 'wants_again' ? 'Marked as Wants Again' : 'Marked as No Need');
      if (onSuccess) onSuccess(shipment.order_id, action);
      onClose();
    } catch (err) {
      console.error(err);
      error('Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToVerification = async () => {
    setSubmitting(true);
    try {
      await smSendToVerification(shipment._id, { source: 'rto' });
      success('Order moved back to Verification list');
      if (onSuccess) onSuccess(shipment.order_id, 'send_to_verification');
      onClose();
    } catch (err) {
      console.error(err);
      error('Failed to move to verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const dataToDisplay = details || shipment;
  const customer = dataToDisplay.billing_customer_name || '—';
  const phone = dataToDisplay.billing_phone || '—';

  // Use local shipment data for internal fields, and fallback to dataToDisplay (which might be external API data)
  const ver = shipment.verification_id || {};
  const isRtoComment = (c) => {
    if (!c) return false;
    const sec = String(c.section || '').toLowerCase().trim();
    return sec === 'rto_verification' || sec === 'rto verification' || sec === 'rto';
  };
  const rtoComments = (commentsList || []).filter(isRtoComment);

  const task = shipment.notes || ver.task || ver.note || shipment.lead_id?.note || (shipment.follow_ups?.[shipment.follow_ups.length - 1]?.note) || '—';
  const problem = ver.problem || shipment.problem || dataToDisplay.problem || dataToDisplay.order_items?.[0]?.name || '—';
  const address = dataToDisplay.billing_address || '—';
  const city = dataToDisplay.billing_city || '—';
  const state = dataToDisplay.billing_state || '—';
  const pincode = dataToDisplay.billing_pincode || '—';
  const price = dataToDisplay.sub_total || dataToDisplay.price || 0;
  const awb = dataToDisplay.awb_code || '—';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>RTO Verification</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Loading details...</div>
          ) : (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
              <Field label="AWB" value={awb} />
              {/* Delivery Boy / Courier Failure Reason */}
              {(shipment?.rto_reason || shipment?.ndr_reason || shipment?.courier_remarks || dataToDisplay?.rto_reason || dataToDisplay?.ndr_reason || dataToDisplay?.courier_remarks) && (
                <div style={{
                  padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 4
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚠️ Delivery Boy / Courier Reason (ShipMaxx)
                  </span>
                  <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 600, lineHeight: 1.4 }}>
                    {shipment?.rto_reason || shipment?.ndr_reason || shipment?.courier_remarks || dataToDisplay?.rto_reason || dataToDisplay?.ndr_reason || dataToDisplay?.courier_remarks}
                  </span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Customer" value={customer} />
                <Field label="Phone" value={phone} />
              </div>
              <Field label="Address" value={address} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="City" value={city} />
                <Field label="State" value={state} />
                <Field label="Pincode" value={pincode} />
              </div>
              <Field label="Price" value={`₹${price.toLocaleString('en-IN')}`} />
              <Field label="Problem" value={problem} />
              {/* Health Info from Verification (always visible) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Age" value={ver.age ? `${ver.age} Yrs` : '—'} />
                <Field label="Weight" value={ver.weight ? `${ver.weight} kg` : '—'} />
                <Field label="Height" value={ver.height ? `${ver.height} ft` : '—'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Problem Duration" value={ver.problemDuration || '—'} />
                <Field label="Other Problems" value={ver.otherProblems || '—'} />
              </div>

              {/* Task / Note */}
              <Field label="Task / Note" value={task} />

              {/* Comments & Add Comment Section */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    💬 RTO Comments ({rtoComments.length})
                  </span>
                </div>

                {/* Comments List - Only shows comments added from RTO Verification */}
                {rtoComments.length > 0 ? (
                  <div style={{
                    maxHeight: 160,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 2
                  }}>
                    {rtoComments.map((c, idx) => {
                      const authorName = c.creatorName || c.createdBy?.name || (typeof c.createdBy === 'string' && !/^[a-f\d]{24}$/i.test(c.createdBy) ? c.createdBy : null);
                      const authorRole = c.creatorRole || c.createdBy?.role || '';
                      const author = authorName
                        ? `${authorName}${authorRole ? ` (${authorRole})` : ''}`
                        : (user?.name ? `${user.name} (${user.role || 'staff'})` : 'Staff');
                      const time = c.createdAt
                        ? new Date(c.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '';
                      return (
                        <div key={idx} style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '8px 10px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{author}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{time}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            {c.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                    No comments added from RTO Verification yet.
                  </div>
                )}

                {/* Add Comment Input Form */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add comment here..."
                    disabled={addingComment}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 12,
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      outline: 'none',
                      background: '#fff'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <button
                    type="submit"
                    disabled={addingComment || !commentText.trim()}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: 'none',
                      background: commentText.trim() ? '#2563eb' : '#94a3b8',
                      color: '#fff',
                      cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {addingComment ? 'Saving...' : 'Add Comment'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#f8fafc'
        }}>
          <button 
            disabled={submitting || loading}
            onClick={() => handleVerification('no_need')}
            style={{
              padding: '8px 12px', fontSize: '13px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fee2e2',
              color: '#dc2626', fontWeight: 600, cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
              opacity: submitting ? 0.6 : 1
            }}
          >
            ❌ No Need (Cancel)
          </button>
          <button 
            disabled={submitting || loading}
            onClick={() => handleVerification('wants_again')}
            style={{
              padding: '8px 12px', fontSize: '13px', borderRadius: 8, border: 'none', background: '#16a34a',
              color: '#fff', fontWeight: 600, cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
              opacity: submitting ? 0.6 : 1
            }}
          >
            ✅ Wants Again (Re-attempt)
          </button>
          <button 
            disabled={submitting || loading}
            onClick={handleSendToVerification}
            style={{
              padding: '8px 16px', fontSize: '12px', borderRadius: 24, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#fff', fontWeight: 700, cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.4)', textTransform: 'uppercase', letterSpacing: '0.5px',
              opacity: submitting ? 0.6 : 1
            }}
          >
            🔄 Send to Verification
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

