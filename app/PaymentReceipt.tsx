import React from "react";
import { Card, CardHeader, CardBody, CardFooter, Divider, Chip } from "@heroui/react";

interface PaymentReceiptProps {
  status: string;
  summary: string;
  txn_id: string;
  balance: number;
  prepared_id: string;
}

export const PaymentReceipt = ({ status, summary, txn_id, balance, prepared_id }: PaymentReceiptProps) => {
  const isSuccess = status === "success";

  return (
    <Card className="max-w-[400px] border-none bg-background/60 dark:bg-default-100/50">
      <CardHeader className="flex justify-between items-center px-6 pt-6">
        <div className="flex flex-col">
          <p className="text-small text-default-500 uppercase font-bold">Transaction Receipt</p>
          <p className="text-tiny text-default-400">ID: {txn_id}</p>
        </div>
        <Chip 
          color={isSuccess ? "success" : "danger"} 
          variant="flat"
          size="sm"
        >
          {isSuccess ? "สำเร็จ" : "ไม่สำเร็จ"}
        </Chip>
      </CardHeader>
      <CardBody className="px-6 py-4">
        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-3xl font-bold">฿{balance.toLocaleString()}</span>
          <p className="text-small text-default-600 text-center mt-2">{summary}</p>
        </div>
      </CardBody>
      <Divider />
      <CardFooter className="px-6 py-4">
        <p className="text-tiny text-default-400 truncate">Ref: {prepared_id}</p>
      </CardFooter>
    </Card>
  );
};