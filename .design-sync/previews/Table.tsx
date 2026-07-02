import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  Badge,
} from 'souqna';

export const OrdersTable = () => (
  <Table>
    <TableCaption>Recent orders — Qahwa Corner</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Order</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Status</TableHead>
        <TableHead style={{ textAlign: 'right' }}>Amount</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell style={{ fontWeight: 500 }}>#SQ-1042</TableCell>
        <TableCell>Maryam Al-Sulaiti</TableCell>
        <TableCell><Badge>Delivered</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>QAR 86.00</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ fontWeight: 500 }}>#SQ-1041</TableCell>
        <TableCell>Khalid Al-Marri</TableCell>
        <TableCell><Badge variant="secondary">Preparing</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>QAR 42.50</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ fontWeight: 500 }}>#SQ-1040</TableCell>
        <TableCell>Noora Al-Kuwari</TableCell>
        <TableCell><Badge variant="outline">Pending</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>QAR 118.00</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ fontWeight: 500 }}>#SQ-1039</TableCell>
        <TableCell>Yousef Al-Thani</TableCell>
        <TableCell><Badge variant="destructive">Cancelled</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>QAR 24.00</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ fontWeight: 500 }}>#SQ-1038</TableCell>
        <TableCell>Aisha Al-Emadi</TableCell>
        <TableCell><Badge>Delivered</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>QAR 63.75</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);
