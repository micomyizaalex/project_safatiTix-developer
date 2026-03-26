import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertCircle, Printer, CheckCircle2, XCircle, Loader2, User, MapPin, Calendar, Clock, Bus, Ticket as TicketIcon, CreditCard } from 'lucide-react';

export function ScannedTicketPage() {
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const ticketId = params.get('ticketId') || params.get('id') || params.get('t');

  useEffect(() => {
    async function fetchTicket() {
      if (!ticketId) {
        setError('No ticket ID provided in URL.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Use the scan endpoint (no authentication required for scanning)
        const res = await fetch(`${API_URL}/tickets/scan/${ticketId}`);
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || data.error || 'Failed to load ticket');
        }

        const data = await res.json();
        
        if (!data.ticket) {
          throw new Error('Ticket not found');
        }

        setTicket(data.ticket);
      } catch (err: any) {
        console.error('Error fetching ticket:', err);
        setError(err.message || 'Failed to load ticket details. Please check the ticket ID.');
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [ticketId]);

  // Format helpers
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  const getPaymentMethodName = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    const methods: { [key: string]: string } = {
      'mobile_money': 'MTN Mobile Money',
      'airtel_money': 'Airtel Money',
      'card_payment': 'Card Payment'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#0077B6]" />
            <p className="text-muted-foreground">Loading ticket details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
      <Card className="w-full max-w-3xl shadow-2xl border-2 border-[#0077B6]">
        <CardHeader className="border-b-2 border-[#0077B6]">
          <div className="flex items-center gap-3">
            <TicketIcon className="w-8 h-8 text-[#0077B6]" />
            <div>
              <CardTitle className="text-3xl text-[#0077B6]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Scanned Ticket
              </CardTitle>
              <CardDescription>Ticket Verification Details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          {error && (
            <Alert className="border-destructive bg-red-50 dark:bg-red-950/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          {!error && ticket && (
            <>
              {/* Status Badges */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Badge 
                    className={
                      ticket.status === 'booked' ? 'bg-[#0077B6] text-white text-base px-4 py-2' :
                      ticket.status === 'checked_in' ? 'bg-[#27AE60] text-white text-base px-4 py-2' :
                      ticket.status === 'cancelled' ? 'bg-red-500 text-white text-base px-4 py-2' :
                      'bg-gray-500 text-white text-base px-4 py-2'
                    }
                  >
                    {ticket.status === 'booked' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        BOOKED
                      </>
                    ) : ticket.status === 'checked_in' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        CHECKED IN
                      </>
                    ) : ticket.status === 'cancelled' ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        CANCELLED
                      </>
                    ) : (
                      ticket.status?.toUpperCase() || 'UNKNOWN'
                    )}
                  </Badge>
                  {ticket.isValid !== false && (
                    <Badge className="bg-[#27AE60] text-white text-base px-4 py-2">
                      ✓ VALID
                    </Badge>
                  )}
                  {ticket.isUsed && (
                    <Badge className="bg-orange-500 text-white text-base px-4 py-2">
                      ⚠️ ALREADY USED
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Ticket ID</p>
                  <p className="font-mono text-sm font-semibold">{ticket.id?.slice(0, 8) || 'N/A'}</p>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Passenger Info */}
                  <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-5 h-5 text-[#0077B6]" />
                      <h3 className="font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Passenger
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-semibold text-base">{ticket.passengerName || 'N/A'}</p>
                      </div>
                      {ticket.passengerEmail && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm">{ticket.passengerEmail}</p>
                        </div>
                      )}
                      {ticket.passengerPhone && (
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm">{ticket.passengerPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route Info */}
                  <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-[#0077B6]" />
                      <h3 className="font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Route
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="font-semibold text-base">{ticket.routeFrom || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">To</p>
                        <p className="font-semibold text-base">{ticket.routeTo || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bus Info */}
                  <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Bus className="w-5 h-5 text-[#0077B6]" />
                      <h3 className="font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Bus Details
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Plate Number</p>
                        <p className="font-semibold text-base font-mono">{ticket.busPlate || ticket.busPlateNumber || 'N/A'}</p>
                      </div>
                      {ticket.busModel && (
                        <div>
                          <p className="text-xs text-muted-foreground">Model</p>
                          <p className="text-sm">{ticket.busModel}</p>
                        </div>
                      )}
                      {ticket.companyName && (
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="text-sm">{ticket.companyName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Travel Date */}
                  <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-[#0077B6]" />
                      <h3 className="font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Travel Date
                      </h3>
                    </div>
                    <p className="font-semibold text-base">
                      {formatDate(ticket.scheduleDate || ticket.travelDate)}
                    </p>
                  </div>

                  {/* Schedule */}
                  <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-[#0077B6]" />
                      <h3 className="font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Schedule
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Departure Time</p>
                        <p className="font-semibold text-base">{formatTime(ticket.departureTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Arrival Time</p>
                        <p className="font-semibold text-base">{formatTime(ticket.arrivalTime)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Seat & Price */}
                  <div className="bg-gradient-to-r from-[#0077B6] to-[#005a8c] text-white p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs opacity-90">Seat Number</p>
                        <p className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {ticket.seatNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-90">Price</p>
                        <p className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          RWF {ticket.price ? ticket.price.toLocaleString() : '0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  {ticket.paymentMethod && (
                    <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-[#0077B6]" />
                        <h3 className="font-semibold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          Payment
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Method</p>
                          <p className="text-sm font-semibold">{getPaymentMethodName(ticket.paymentMethod)}</p>
                        </div>
                        {ticket.paymentStatus && (
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge 
                              className={
                                ticket.paymentStatus === 'SUCCESS' ? 'bg-[#27AE60] text-white' :
                                ticket.paymentStatus === 'PENDING' ? 'bg-orange-500 text-white' :
                                'bg-red-500 text-white'
                              }
                            >
                              {ticket.paymentStatus}
                            </Badge>
                          </div>
                        )}
                        {ticket.transactionRef && (
                          <div>
                            <p className="text-xs text-muted-foreground">Transaction Ref</p>
                            <p className="text-xs font-mono">{ticket.transactionRef}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Booking Info */}
                  <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-4 rounded-lg">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Booking Reference</p>
                        <p className="text-sm font-mono">{ticket.bookingRef || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Booked At</p>
                        <p className="text-sm">{formatDateTime(ticket.bookedAt || ticket.createdAt)}</p>
                      </div>
                      {ticket.checkedInAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Checked In At</p>
                          <p className="text-sm">{formatDateTime(ticket.checkedInAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t print:hidden">
                <Button onClick={() => window.print()} className="bg-[#0077B6] hover:bg-[#005a8c]">
                  <Printer className="w-4 h-4 mr-2" />
                  Print / Save PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
