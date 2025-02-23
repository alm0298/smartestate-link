import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Property {
  id: string;
  address: string;
  price: number;
  monthly_rent: number;
  estimated_expenses: number;
  roi: number;
  details?: {
    square_meters?: number;
    price_per_meter?: number;
  };
  pros?: string[];
  cons?: string[];
  summary?: string;
  score?: number;
}

interface PropertyComparisonProps {
  properties: Property[];
  onClose: () => void;
}

export const PropertyComparison = ({ properties, onClose }: PropertyComparisonProps) => {
  const navigate = useNavigate();

  const renderStars = (score: number | undefined) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${(score || 0) >= star ? "text-yellow-400" : "text-gray-300"}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "N/A";
    return `€${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Property Comparison</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Property</TableHead>
              {properties.map((property) => (
                <TableHead key={property.id} className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate(`/properties/${property.id}`)}
                    className="font-medium"
                  >
                    {property.address}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Area</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center">
                  {property.details?.square_meters ? `${property.details.square_meters} m²` : "N/A"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Price per m²</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center">
                  {property.details?.price_per_meter
                    ? formatCurrency(property.details.price_per_meter)
                    : "N/A"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Expected Income</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center">
                  {formatCurrency(property.monthly_rent)}/month
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Expenses</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center">
                  {formatCurrency(property.estimated_expenses)}/month
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">ROI</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center font-medium">
                  <span className={property.roi >= 5 ? "text-green-600" : "text-yellow-600"}>
                    {property.roi ?? "N/A"}%
                  </span>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Rating</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center">
                  <div className="flex justify-center">
                    {renderStars(property.score)}
                  </div>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Summary</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id} className="text-center">
                  {property.summary || "No summary available"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pros</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id}>
                  {property.pros?.length ? (
                    <ul className="list-disc ml-4">
                      {property.pros.map((pro, index) => (
                        <li key={index}>{pro}</li>
                      ))}
                    </ul>
                  ) : (
                    "No pros listed"
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Cons</TableCell>
              {properties.map((property) => (
                <TableCell key={property.id}>
                  {property.cons?.length ? (
                    <ul className="list-disc ml-4">
                      {property.cons.map((con, index) => (
                        <li key={index}>{con}</li>
                      ))}
                    </ul>
                  ) : (
                    "No cons listed"
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 